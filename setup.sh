
sudo yum install -y \
    git \
    gcc-c++ \
    java-1.6.0-openjdk-devel

[ ! -d "./AutoPhrase" ] && git clone https://github.com/shangjingbo1226/AutoPhrase.git

echo Compiling AutoPhrase...
(cd AutoPhrase/ && ./compile.sh)