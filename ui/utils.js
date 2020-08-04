

// a Set of strings
localStorage.positivePhrases = localStorage.positivePhrases || JSON.stringify([])

// a Set of strings
localStorage.negativePhrases = localStorage.negativePhrases || JSON.stringify([])

// a Set of strings
localStorage.unlabelledPhrases = localStorage.unlabelledPhrases || JSON.stringify([])

class PhraseDatabase {
    constructor() {
        this.positivePhrases = new Set(JSON.parse(localStorage.positivePhrases))
    }

    addPositivePhrases(phrases) {
        for (let phrase of phrases) {
            this.positivePhrases.add(phrase)
        }

        localStorage.positivePhrases = JSON.stringify([...this.positivePhrases])
    }

    getPositivePhrases() {
        return [...this.positivePhrases];
    }

    clearPositivePhrases() {
        localStorage.removeItem('positivePhrases');
        this.positivePhrases = new Set([])
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
