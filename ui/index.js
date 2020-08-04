// Vue.component('multiselect', window.VueMultiselect.default)
const HOST = "http://ec2-34-239-169-229.compute-1.amazonaws.com:5000";

const userMessage = {
    'TOKENIZING_USER_FILE': 'Tokenizing User File ',
    'TOKENIZING_KNOWLEDGE_BASE': 'Tokenizing Knowledge Base',
    'PERFORMING_PART_OF_SPEECH_TAGGING': 'Performing Part-Of-Speech Tagging',
    'EXTRACTING_PHRASES': 'Extracing Phrases',
    'SAVING_MODEL': 'Saving Model',
    'SAVING_PRASES': 'Saving Phrases'
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
        topPhraseCount: 10
    },

    mounted() {
        // this.environment.apiUrl = location.host.split(':')[0]

        this.savedPositivePhrases = this.phraseDatabase.getPositivePhrases()

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
                console.log("invoking algorithm")

                // this.socket.emit('dummyInvokeAlgorithm', { positiveLabels: this.savedPositivePhrases, negativeLabels: this.phraseDatabase.getNegativePhrases(), topPhraseCount: 20 });
                console.log("sending", this.phraseDatabase.getNegativePhrases())
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
        }
    }
})
