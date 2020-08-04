

// a Set of strings
localStorage.positivePhrases = localStorage.positivePhrases || JSON.stringify([])

// a Set of strings
localStorage.negativePhrases = localStorage.negativePhrases || JSON.stringify([])

// a Set of strings
localStorage.unlabelledPhrases = localStorage.unlabelledPhrases || JSON.stringify([])

class PhraseDatabase {
    constructor() {
        this.positivePhrases = new Set(JSON.parse(localStorage.positivePhrases))
        this.negativePhrases = new Set(JSON.parse(localStorage.negativePhrases))
    }

    addPhrases(positivePhrases, allPhrases) {
        for (let phrase of positivePhrases) {
            this.positivePhrases.add(phrase)
        }

        for (let phrase of allPhrases) {
            if (!this.positivePhrases.has(phrase)) {
                this.negativePhrases.add(phrase)
            }
        }

        localStorage.positivePhrases = JSON.stringify([...this.positivePhrases])
        localStorage.negativePhrases = JSON.stringify([...this.negativePhrases])
    }

    getPositivePhrases() {
        return [...this.positivePhrases];
    }

    getNegativePhrases() {
        return [...this.negativePhrases];
    }

    clearPhrases() {
        localStorage.removeItem('positivePhrases');
        this.positivePhrases = new Set([])

        localStorage.removeItem('negativePhrases');
        this.negativePhrases = new Set([])
    }
}

///////////////////// Create /////////////////////
function addPositivePhrase(phrase) {
    localStorage.positivePhrases.add(phrase);
}

function addPositivePhrases(phrases) {
    localStorage.positivePhrases.add(phrase);
}


function addNegativePhrase(phrase) {
    localStorage.negativePhrases.add(phrase);
}

function addUnlabelledPhrase(phrase) {
    localStorage.unlabelledPhrases.add(phrase);
}

///////////////////// Retrieve /////////////////////

function getPositivePhrases(phrase) {
    return localStorage.positivePhrases;
}

function getNegativePhrases(phrase) {
    return localStorage.negativePhrases;
}

function getUnlabelledPhrases(phrase) {
    return localStorage.unlabelledPhrases;
}

///////////////////// Delete /////////////////////

function deletePositivePhrase(phrase) {
    localStorage.positivePhrases.delete(phrase);
}

function deleteNegativePhrase(phrase) {
    localStorage.negativePhrases.delete(phrase);
}

function deleteUnlabelledPhrase(phrase) {
    localStorage.unlabelledPhrases.delete(phrase);
}

function clearPositivePhrases() {
    localStorage.positivePhrases.clear();
}

function clearNegativePhrases() {
    localStorage.negativePhrases.clear();
}

function clearUnlabelledPhrases() {
    localStorage.unlabelledPhrases.clear();
}
