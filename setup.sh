
sudo yum install -y \
    gcc-c++ \
    java-1.8.0-openjdk-devel

[ ! -d "./AutoPhrase" ] && git clone https://github.com/shangjingbo1226/AutoPhrase.git

echo Compiling AutoPhrase...
(cd AutoPhrase/ && ./compile.sh)

curl -L https://repo.continuum.io/miniconda/Miniconda3-latest-Linux-x86_64.sh > /tmp/miniconda-installer.sh
bash /tmp/miniconda-installer.sh -b -p ~/miniconda
~/miniconda/bin/conda init
source ~/.bashrc

echo "safety_checks: disabled" >> ~/.condarc
echo "allow_conda_downgrades: true" >> ~/.condarc
echo "changeps1: False" >> ~/.condarc

conda create -p ./conda_env
conda activate ./conda_env

conda install python=3.8 flask flask-socketio
pip install eventlet