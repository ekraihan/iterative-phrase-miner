import os
from flask import Flask, request, make_response, render_template
from werkzeug.utils import secure_filename
from flask_socketio import SocketIO, join_room, emit, send
import threading
from eventlet.green import subprocess
import uuid
import shutil
import threading

app = Flask(__name__, template_folder="ui", static_folder="ui", static_url_path="")
app.config['UPLOAD_FOLDER'] = "./uploads"
socketio = SocketIO(app, async_mode='eventlet')

g_lock = threading.Lock()
g_browsersToJobs = {}

####################################################

def start_mining_process(trainingFile, modelPath, positivePhrases):

    qualityPhrasesPath = ''

    if (len(positivePhrases) > 0):
        os.makedirs(modelPath) 
        qualityPhrasesPath = f'{modelPath}/quality_phrases.txt'
        with open(qualityPhrasesPath, 'w') as qualityPhrases:
            for phrase in positivePhrases:
                qualityPhrases.write("%s\n" % phrase.replace('\n', ' '))

    return subprocess.Popen(['bash', 'mine_phrases.sh'], 
                           stdout=subprocess.PIPE,
                           stderr=subprocess.PIPE,
                           env={
                               'MODEL_DIR': modelPath,
                               'RAW_TRAIN': trainingFile,
                               'QUALITY_PHRASES': qualityPhrasesPath
                           },
                           text=True)

def collect_top_n_phrases(autoPhraseIter, topPhraseCount, clientPhrases):

    print("cli dude:", clientPhrases)
    finalPhrases = list()
    for rawPhrase in autoPhraseIter:
        phrase = rawPhrase.split('\t')[1].strip()
        print("next")
        if phrase not in clientPhrases:
            print("found new phrase")
            finalPhrases.append(phrase)
            if len(finalPhrases) == topPhraseCount:
                break

    return finalPhrases


userMessages = set({
    'TOKENIZING_USER_FILE',
    'TOKENIZING_KNOWLEDGE_BASE',
    'PERFORMING_PART_OF_SPEECH_TAGGING',
    'EXTRACTING_PHRASES',
    'SAVING_MODEL',
    'SAVING_PRASES'
})

def mine_phrases(args):
    try:
        socketIoRoom = args[0]
        clientData = args[1]
        topPhraseCount = clientData['topPhraseCount']
        positivePhrases = clientData['positiveLabels']
        negativePhrases = clientData['negativeLabels']
        clientPhrases = negativePhrases + positivePhrases
        browserId = clientData['browserId']

        modelPath = f'models/{str(uuid.uuid4())}'

        trainingData = f'client-data/{browserId}.txt'
        if not os.path.exists(trainingData):
            trainingData = 'data/reviews-chinese.txt'

        process = start_mining_process(trainingData, modelPath, positivePhrases)

        g_lock.acquire()
        g_browsersToJobs[browserId] = process
        g_lock.release()

        while True:
            nextLine = process.stdout.readline().strip()

            print(nextLine)
            if (nextLine in userMessages):
                socketio.emit('miningProgressing', nextLine, room=socketIoRoom)
            returnCode = process.poll()
            if returnCode is not None:
                # Process has finished, read rest of the output 
                for output in process.stdout.readlines():
                    socketio.emit('miningProgressing', room=socketIoRoom)

                if (returnCode == 0):
                    if os.path.exists(f'{modelPath}/AutoPhrase.txt'):
                        with open(f'{modelPath}/AutoPhrase.txt') as autoPhraseIter:
                            topLabels = collect_top_n_phrases(autoPhraseIter, topPhraseCount, clientPhrases)
                        socketio.emit('miningFinished', {'topLabels': topLabels }, room=socketIoRoom)
                    else:
                        socketio.emit('miningFailed', room=socketIoRoom)
                elif (returnCode == -9):
                    socketio.emit('miningKilled', room=socketIoRoom)
                else:
                    socketio.emit('miningFailed', room=socketIoRoom)

                shutil.rmtree(modelPath, ignore_errors=True)

                break
    except Exception as e:
        print(e)
        socketio.emit('miningFailed', room=socketIoRoom)
    finally:
        shutil.rmtree(f'{modelPath}/quality_phrases.txt', ignore_errors=True)
        shutil.rmtree(modelPath, ignore_errors=True)

        g_lock.acquire()
        if (browserId in g_browsersToJobs):
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
    with open(f'./ui/index.html') as indexHtml:
        resp = make_response(indexHtml.read())

    if ('browserId' not in request.cookies):
        resp.set_cookie('browserId', str(uuid.uuid4()))

    return resp

@socketio.on('invokeAlgorithm')
def invoke_alogrithm(clientData):
    join_room(request.sid)

    threadData = clientData
    threadData['browserId'] = request.cookies['browserId']

    socketio.start_background_task(target=mine_phrases, args=(request.sid, threadData))

@socketio.on('dummyInvokeAlgorithm')
def dummy_invoke_alogrithm(clientData):

    print(clientData['positiveLabels'])
    print(clientData['negativeLabels'])
    socketio.emit('miningFinished', {'topLabels': ['peas', 'and', 'carrots', "M, y"] }, room=request.sid)

@socketio.on('killAlgorithm')
def kill_algorithm():
    kill_mining_process_for_browser(request.cookies['browserId'])

@socketio.on('disconnect')
def client_disconnect():
    kill_algorithm()

@app.route('/uploader', methods=['GET', 'POST'])
def upload_file():
    if request.method == 'POST':
        # check if the post request has the file part
        if 'file' not in request.files:
            print("blah bad 1")
            # flash('No file part')
            # return redirect(request.url)
        file = request.files['file']
        # if user does not select file, browser also
        # submit an empty part without filename
        if file.filename == '':
            print("blah bad 2")
            # return redirect(request.url)
        if file:#  and allowed_file(file.filename):
            os.makedirs("client-data", exist_ok=True)
            clientDataDir = f"client-data/{request.cookies['browserId']}.txt"
            file.save(clientDataDir)
            # filename = secure_filename(file.filename)
            # file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            # return redirect(url_for('uploaded_file',
            #                         filename=filename))

    return "", 200

if __name__ == '__main__':
    shutil.rmtree("./models", ignore_errors=True)
    socketio.run(app, debug=True, host="0.0.0.0")

    