// Vue.component('multiselect', window.VueMultiselect.default)
const HOST = "http://ec2-3-237-1-155.compute-1.amazonaws.com:5000/";

const userMessage = {
    'TOKENIZING_USER_FILE': 'Tokenizing User File ',
    'TOKENIZING_KNOWLEDGE_BASE': 'Tokenizing Knowledge Base',
    'PERFORMING_PART_OF_SPEECH_TAGGING': 'Performing Part-Of-Speech Tagging',
    'EXTRACTING_PHRASES': 'Extracing Phrases',
    'SAVING_MODEL': 'Writing Model to Disk',
    'SAVING_PRASES': 'Writing Phrases to Disk'
}

new Vue({
    el: "#root",
    data: {
        environment: {
            apiUrl: ''
        },
        unlabelledPhrases: [],
        negativePhrases: [],
        positivePhrases: [],
        savedPositivePhrases: [],
        algorithmState: 'IDLE',
        phraseDatabase: new PhraseDatabase(),
        socket: io.connect(HOST),
        progressMessage: null,
        topPhraseCount: 10,
        fileName: null
    },

    mounted() {
        // this.environment.apiUrl = location.host.split(':')[0]

        this.savedPositivePhrases = this.phraseDatabase.getPositivePhrases()
        this.fileName = localStorage.miningFileName

        // this.socket.on('connect', (messageKey) => {
        //     console.log("miningProgressing")
        // });

        this.socket.on('miningProgressing', (messageKey) => {
            console.log("miningProgressing")
            this.progressMessage = "Mining Progress: " + userMessage[messageKey]
        });

        this.socket.on('miningFinished', (payload) => {
            this.algorithmState = 'IDLE';
            this.unlabelledPhrases = payload['topLabels'];
            this.progressMessage = "Finished Mining!"
        });

        this.socket.on('miningFailed', (msg) => {
            console.log("miningFailed")
            this.algorithmState = 'IDLE';
            this.progressMessage = "Mining Failed! Pleas contact eliask2@illinois.edu."
        });

        this.socket.on('miningKilled', (msg) => {
            console.log("miningKilled")
            this.algorithmState = 'IDLE';
            this.progressMessage = "Mining Killed!"
        });

        this.socket.on('algorithmAlreadyRunning', (msg) => {
            console.log("algorithmAlreadyRunning")
        });
    },

    methods: {

        invokeAlgorithm() {
            if (this.algorithmState === 'IDLE') {

                // this.socket.emit('dummyInvokeAlgorithm', { positiveLabels: this.savedPositivePhrases, negativeLabels: this.phraseDatabase.getNegativePhrases(), topPhraseCount: 20 });
                this.socket.emit('invokeAlgorithm', { positiveLabels: this.savedPositivePhrases, negativeLabels: this.phraseDatabase.getNegativePhrases(), topPhraseCount: parseInt(this.topPhraseCount) });
                this.algorithmState = 'RUNNING';
            } else {
                console.log("Algorithm already running")
            }
        },

        killAlgorithm() {
            if (this.algorithmState === 'RUNNING') {
                console.log("invoking algorithm")
                this.socket.emit('killAlgorithm');
                this.progressMessage = "Killing Mining..."
            } else {
                console.log("Algorithm not running")
            }
        },

        saveLabelledPhrases() {
            this.phraseDatabase.addPhrases(this.positivePhrases, this.unlabelledPhrases);
            this.savedPositivePhrases = this.phraseDatabase.getPositivePhrases()
            
            this.unlabelledPhrases = []
            this.positivePhrases = []
        },

        clearPhrases() {
            this.phraseDatabase.clearPhrases();
            this.savedPositivePhrases = []
        },

        uploadFile() {

            
            let file = document.getElementById("client-data").files[0];
            if (!file) {
                window.alert(`Computers can't upload unspecified files`)
                return;
            }
            let formData = new FormData();
            formData.append("file", file);
            this.algorithmState = 'UPLOADING'
            fetch(`${HOST}/upload`, {method: "POST", body: formData})
                .then(response => {
                    if (response.ok) {
                        console.log("Upload Successful")
                        localStorage.miningFileName = file.name
                        this.fileName = file.name
                    } else {
                        window.alert(`Upload failed with reason ${response.statusText}`)
                    }
                    this.algorithmState = 'IDLE'
                })
        },

        useDefaultFile() {
            this.fileName = null
            localStorage.removeItem('miningFileName');
            fetch(`${HOST}/delete-upload`, {method: "POST"})
        }
    }
})
