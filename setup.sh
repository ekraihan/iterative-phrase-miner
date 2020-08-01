
sudo yum install -y \
    gcc-c++ \
    java-1.8.0-openjdk-devel

[ ! -d "./AutoPhrase" ] && git clone https://github.com/shangjingbo1226/AutoPhrase.git

echo Compiling AutoPhrase...
(cd AutoPhrase/ && ./compile.sh)