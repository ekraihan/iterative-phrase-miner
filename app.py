import os
from flask import Flask, request, make_response, render_template
from flask_socketio import SocketIO, join_room, emit, send
import threading
from eventlet.green import subprocess
import uuid
import shutil
import threading

app = Flask(__name__, static_url_path='', static_folder='static')
socketio = SocketIO(app, async_mode='eventlet')

g_lock = threading.Lock()
g_browsersToJobs = {}

####################################################

def start_mining_process(modelPath):
    return subprocess.Popen(['bash', 'mine_phrases.sh'], 
                           stdout=subprocess.PIPE,
                           stderr=subprocess.PIPE,
                           env={
                               'MODEL_DIR': modelPath,
                               'RAW_TRAIN': f'data/reviews.txt'
                           },
                           text=True)

def mine_phrases(args):
    socketIoRoom = args[0]
    clientData = args[1]
    topPhraseCount = clientData['topPhraseCount']
    browserId = clientData['browserId']

    modelPath = f'models/{str(uuid.uuid4())}'
    process = start_mining_process(modelPath)

    g_lock.acquire()
    g_browsersToJobs[browserId] = process
    g_lock.release()

    while True:
        nextLine = process.stdout.readline().strip()

        print(nextLine)
        socketio.emit('miningProgressing', room=socketIoRoom)
        returnCode = process.poll()
        if returnCode is not None:
            # Process has finished, read rest of the output 
            for output in process.stdout.readlines():
                socketio.emit('miningProgressing', room=socketIoRoom)

            if (returnCode == 0):
                with open(f'{modelPath}/AutoPhrase.txt') as autoPhrases:
                    topLabels = [next(autoPhrases).split('\t')[1].strip() for i in range(topPhraseCount)]
                socketio.emit('miningFinished', {'topLabels': topLabels }, room=socketIoRoom)
            elif (returnCode == -9):
                socketio.emit('miningKilled', room=socketIoRoom)
            else:
                socketio.emit('miningFailed', room=socketIoRoom)

            shutil.rmtree(modelPath, ignore_errors=True)

            break
    
    g_lock.acquire()
    del g_browsersToJobs[browserId]
    g_lock.release()

def kill_mining_process_for_browser(browserId):
    g_lock.acquire()
    miningProcess = g_browsersToJobs.get(browserId)
    g_lock.release()
    if (miningProcess is not None):
        miningProcess.kill()

####################################################

@app.route('/')
def hello_world():
    resp = make_response(render_template('index.html'))
    if ('browserId' not in request.cookies):
        resp.set_cookie('browserId', str(uuid.uuid4()))

    return resp

@socketio.on('invokeAlgorithm')
def invoke_alogrithm(clientData):
    join_room(request.sid)

    threadData = clientData
    threadData['browserId'] = request.cookies['browserId']
    socketio.start_background_task(target=mine_phrases, args=(request.sid, threadData))

@socketio.on('killAlgorithm')
def kill_algorithm():
    kill_mining_process_for_browser(request.cookies['browserId'])

@socketio.on('disconnect')
def client_disconnect():
    kill_algorithm()

if __name__ == '__main__':
    shutil.rmtree("./models", ignore_errors=True)
    socketio.run(app, debug=True, host="0.0.0.0")

    