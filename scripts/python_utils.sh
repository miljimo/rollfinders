chmod +x ./scripts/utils.sh && . ./scripts/utils.sh
export PYTHON_CXX=python3.8


function prepare_install_environment(){
    local use_sudo="$1"
    local sudo_command=""

    if [ $use_sudo == 1 ] ; then
        sudo_command=sudo
    fi
    $sudo_command rm -rf /var/lib/ap/lists/lock
    $sudo_command apt-get clean -y
    $sudo_command apt-get update -y
    $sudo_command apt-get install software-properties-commonapt-get install python3 -y
    $sudo_command add-apt-repository ppa:deadsnakes/ppa 
    $sudo_command apt-get update -y
    return $SUCCESS
}

function is_python_installed(){
    local msg=$(command_exists $PYTHON_CXX)
    local status="$?"
    if [ $status != $SUCCESS ] ; then
       echo "Python: $PYTHON_CXX  is not installed"
    fi
    return $status
}

function install_python(){
    is_python_installed
    local status="$?"
    if [ $status != $SUCCESS ] ; then
        # Install python on the current system
        prepare_install_environment 
        return ""
    fi
    local version=$($PYTHON_CXX --version)
    echo "Python Status:  $version Installed"
}

function get_file_folder_path(){
    local filename="$1"
    local foldername=$(dirname $filename)
    echo $foldername
}
# Function takes the file to run.
function execute_file(){
    local filename="$1"
    file_exists "$filename"
    local status=$?
    if [ $status != $SUCCESS ]; then
       return $FAILURE
    fi

    #get the foldername
    local foldername=$(get_file_folder_path $filename)
    folder_exists $foldername
    status=$?
    if [ $status != $SUCCESS ]; then
        echo "unable to access tool folder"
        return $status
    fi
    local executable_file=$(basename $filename)
    pushd "$foldername"
        # on the scripts folder to run the functionality.
        local python_environment=".venv"
        folder_exists $python_environment
        status=$?
        if [ $status != $SUCCESS ]; then
            # if the environment is not activated
            $PYTHON_CXX -m virtualenv .venv
        fi
        # activate python environment.
        . ./.venv/bin/activate
            file_exists requirements_lock.txt
            status=$?
            local nolocked=1
            if [ $status != $SUCCESS ]; then
                $PYTHON_CXX -m pip install -r requirements.txt
                $PYTHON_CXX -m pip freeze >> requirements_lock.txt
                nolocked=0
            fi

            if [ "$nolocked" != 0 ]; then
                $PYTHON_CXX -m pip install -r requirements_lock.txt
            fi
            local output=$($PYTHON_CXX -bB $executable_file)
            echo $output
        # deactivate the environments
        deactivate
    popd
    
    return $?  
  
}