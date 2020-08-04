# This file was adapted from AutoPhrase/auto_phrase.sh

PRIOR_DIR=AutoPhrase/data

# MODEL_NAME should be a unique and valid directory name; the resulting model
# and phrases will be stored here
if [ ! -v MODEL_DIR ]; then
    echo "MODEL_DIR must be set"
    exit 1
fi

# RAW_TRAIN is the input of AutoPhrase, where each line is a single document.
if [ ! -v RAW_TRAIN ]; then
    echo "RAW_TRAIN must be set"
    exit 1
fi

# RAW_LABEL_FILE has an unknown format and has unknown consequences 
RAW_LABEL_FILE=${RAW_LABEL_FILE:-""}


###############################################################################
# AutoPhrase meta parameters
#

# When ENABLE_POS_TAGGING is set to 1, AutoPhrase will utilize the POS tagging
# in the phrase mining. Otherwise, a simple length penalty mode as the same as
# SegPhrase will be used.
ENABLE_POS_TAGGING=1

# A hard threshold of raw frequency is specified for frequent phrase mining,
# which will generate a candidate set.
MIN_SUP=${MIN_SUP:- 10}

# When FIRST_RUN is set to 1, AutoPhrase will run all preprocessing. Otherwise,
# AutoPhrase directly starts from the current preprocessed data in the tmp/ folder.
FIRST_RUN=${FIRST_RUN:- 1}

# Suggested by the authors
LABEL_METHOD=DPDN

# Suggested by the authors
MAX_POSITIVES=-1

# Threads used by AutoPhrase
THREAD=${THREAD:- 10}

green=`tput setaf 2`
reset=`tput sgr0`

if [ $FIRST_RUN -eq 1 ]; then
    rm -rf tmp
fi

mkdir -p tmp
mkdir -p $MODEL_DIR

TOKENIZER="-cp AutoPhrase:AutoPhrase/tools/tokenizer/lib/*:AutoPhrase/tools/tokenizer/resources/:AutoPhrase/tools/tokenizer/build/ Tokenizer"
# TOKENIZER="AutoPhrase/tools/tokenizer/build/Tokenizer"
TOKEN_MAPPING=tmp/token_mapping.txt

if [ $FIRST_RUN -eq 1 ]; then
    echo TOKENIZING_USER_FILE
    TOKENIZED_TRAIN=tmp/tokenized_train.txt
    java $TOKENIZER -m train -i $RAW_TRAIN -o $TOKENIZED_TRAIN -t $TOKEN_MAPPING -c N -thread $THREAD
fi

LANGUAGE=`cat tmp/language.txt`
LABEL_FILE=tmp/labels.txt

if [ $FIRST_RUN -eq 1 ]; then
    TOKENIZED_STOPWORDS=tmp/tokenized_stopwords.txt
    TOKENIZED_ALL=tmp/tokenized_all.txt
    TOKENIZED_QUALITY=tmp/tokenized_quality.txt
    STOPWORDS=$PRIOR_DIR/$LANGUAGE/stopwords.txt
    ALL_WIKI_ENTITIES=$PRIOR_DIR/$LANGUAGE/wiki_all.txt
    QUALITY_WIKI_ENTITIES=${QUALITY_PHRASES:- $PRIOR_DIR/$LANGUAGE/wiki_quality.txt}

    echo "dude" $QUALITY_WIKI_ENTITIES
    # echo -ne "Current step: Tokenizing stopword file...\033[0K\r"
    java $TOKENIZER -m test -i $STOPWORDS -o $TOKENIZED_STOPWORDS -t $TOKEN_MAPPING -c N -thread $THREAD
    echo TOKENIZING_KNOWLEDGE_BASE
    java $TOKENIZER -m test -i $ALL_WIKI_ENTITIES -o $TOKENIZED_ALL -t $TOKEN_MAPPING -c N -thread $THREAD
    java $TOKENIZER -m test -i $QUALITY_WIKI_ENTITIES -o $TOKENIZED_QUALITY -t $TOKEN_MAPPING -c N -thread $THREAD
fi  

if [[ $RAW_LABEL_FILE = *[!\ ]* ]]; then
	echo TOKENIZING_USER_LABELS
	java $TOKENIZER -m test -i $RAW_LABEL_FILE -o $LABEL_FILE -t $TOKEN_MAPPING -c N -thread $THREAD
else
	echo -ne "No provided expert labels.\033[0K\n"
fi

if [ ! $LANGUAGE == "JA" ] && [ ! $LANGUAGE == "CN" ]  && [ ! $LANGUAGE == "OTHER" ]  && [ $ENABLE_POS_TAGGING -eq 1 ] && [ $FIRST_RUN -eq 1 ]; then
    echo PERFORMING_PART_OF_SPEECH_TAGGING

    # Use an absolute path for RAW so that ./tools/treetagger/pos_tag.sh has the correct reference
    RAW=`pwd`/tmp/raw_tokenized_train.txt

    # Make a tmp directory for ./tools/treetagger/pos_tag.sh to use
    mkdir AutoPhrase/tmp

    # Export variables for ./tools/treetagger/pos_tag.sh to use
    export THREAD LANGUAGE RAW

    # ./tools/treetagger/pos_tag.sh needs to be run from the AutoPhrase directory
    (cd AutoPhrase && bash ./tools/treetagger/pos_tag.sh)

    # Move the result of ./tools/treetagger/pos_tag.sh to our project's tmp directory
    # note that the name pos_tags_tokenized_train.txt is important
    mv AutoPhrase/tmp/pos_tags.txt tmp/pos_tags_tokenized_train.txt

    # Remove up the directory we made for pos_tag.sh
    rm -rf AutoPhrase/tmp
fi

### END Part-Of-Speech Tagging ###

echo EXTRACTING_PHRASES

if [ $ENABLE_POS_TAGGING -eq 1 ]; then
    ./AutoPhrase/bin/segphrase_train \
        --pos_tag \
        --thread $THREAD \
        --pos_prune ${PRIOR_DIR}/BAD_POS_TAGS.txt \
        --label_method $LABEL_METHOD \
		--label $LABEL_FILE \
        --max_positives $MAX_POSITIVES \
        --min_sup $MIN_SUP
else
    ./AutoPhrase/bin/segphrase_train \
        --thread $THREAD \
        --label_method $LABEL_METHOD \
		--label $LABEL_FILE \
        --max_positives $MAX_POSITIVES \
        --min_sup $MIN_SUP
fi

echo SAVING_MODEL

cp tmp/segmentation.model ${MODEL_DIR}/segmentation.model
cp tmp/token_mapping.txt ${MODEL_DIR}/token_mapping.txt
cp tmp/language.txt ${MODEL_DIR}/language.txt

### END AutoPhrasing ###

echo SAVING_PRASES
# java $TOKENIZER -m translate -i tmp/final_quality_multi-words.txt -o ${MODEL_DIR}/AutoPhrase_multi-words.txt -t $TOKEN_MAPPING -c N -thread $THREAD
# java $TOKENIZER -m translate -i tmp/final_quality_unigrams.txt -o ${MODEL_DIR}/AutoPhrase_single-word.txt -t $TOKEN_MAPPING -c N -thread $THREAD
java $TOKENIZER -m translate -i tmp/final_quality_salient.txt -o ${MODEL_DIR}/AutoPhrase.txt -t $TOKEN_MAPPING -c N -thread $THREAD

# java $TOKENIZER -m translate -i tmp/distant_training_only_salient.txt -o results/DistantTraning.txt -t $TOKEN_MAPPING -c N -thread $THREAD

### END Generating Output for Checking Quality ###
