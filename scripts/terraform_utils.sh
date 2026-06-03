#!/bin/bash
chmod +x ./scripts/utils.sh && . ./scripts/utils.sh
chmod +x ./scripts/git_utils.sh && . ./scripts/git_utils.sh
chmod +x ./scripts/aws_utils.sh && . ./scripts/aws_utils.sh
export TERRAFORM_VERSION='1.10.5'
export TERRAFORM_CXX=terraform
export TERRAFORM_ZIP_FILENAME="terraform_${TERRAFORM_VERSION}_linux_amd64.zip"
export TERRAFORM_REMOTE_PATH="https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/${TERRAFORM_ZIP_FILENAME}"
export PROJECT_DIR=$(pwd)
export TERRAFORM_DIRECTORY="${PROJECT_DIR}"


function is_terraform_installed(){
    local result=$(command_exists $TERRAFORM_CXX)
    local status=$?
    return $status
}

function terraform_workspace_exists() {
  local workspace="${1,,}"
  local workspaces="$($TERRAFORM_CXX workspace list)"

  set -f
    for name in ${workspaces[@]}; do
      name="${name,,}"
      # discard the wildcard
      if [ "*" == "$name" ]; then
        continue
      fi
      if [ "$name" == "$workspace" ]; then
         return 0
      fi
    done
  set +f
  return 1  
}

function install_terraform(){
    echo "installing terraform cli tool..."
    local filename="$PROJECT_BIN_FOLDER/$TERRAFORM_ZIP_FILENAME"
    file_exists $filename
    local status=$?
    if  [ $status != $SUCCESS ] ; then
     rm -rf $filename
     rm -rf $PROJECT_BIN_FOLDER/terraform
    fi
    
    pushd $PROJECT_BIN_FOLDER
        local cur_dir=$(pwd)
        wget --directory-prefix=$cur_dir  $TERRAFORM_REMOTE_PATH 
        unzip $cur_dir/$TERRAFORM_ZIP_FILENAME
        mv -fu $cur_dir/terraform /usr/local/bin/ 
    popd
    echo "Installed : $($TERRAFORM_CXX --version) "
    
    # always install aws cli
    install_aws_cli

    return $?
}

function install_terraform_if_not_exists(){
  command_exists $TERRAFORM_CXX
  local status=$?
  if [ $status != $SUCCESS ] ; then
    echo "terraform installing..."
    install_terraform
  fi
  echo "terraform installation complated"
  return $SUCCESS
}

function export_variables_to_terraform(){
  local branch_name=$(get_branch_name)
  export TF_LOG=trace
  export TF_VAR_aws_region=$AWS_REGION   
  export TF_VAR_environment_name=$branch_name
  export TF_WORKSPACE=$branch_name

  #Normal Variables Versions
  export ENVIRONMENT_NAME=$branch_name
}

function  import_terraform_variables(){
  echo "Importing terraform variables"
  pushd "${TERRAFORM_DIRECTORY}"
    export WEB_SITE_BUCKET_NAME=$(${TERRAFORM_CXX} output "website_bucket_name")
  popd
}

function select_terraform_workspace(){
    local branch_name=$(get_branch_name)
    pushd "${TERRAFORM_DIRECTORY}"
        terraform_workspace_exists "$branch_name"
        local status="$?"
        if [ $status != 0 ]; then
            $TERRAFORM_CXX  workspace new "$branch_name"
        fi
        $TERRAFORM_CXX  workspace select  "$branch_name"
    popd
   
    return "$?"
}

function terraform_clean_deployment(){
    install_terraform_if_not_exists
    terraform_deploy
    import_terraform_variables
    return $SUCCESS
}


function terraform_init(){
  local variables_file="$1"
  if [ -z "${variables_file}" ] ; then
    variables_file='backend.tfvars'
  fi
  pushd "${TERRAFORM_DIRECTORY}"
    echo "TERRAFORM DIR = $(pwd)"
    $TERRAFORM_CXX init -backend-config=$variables_file -reconfigure
  popd
}

function terraform_deploy(){
    echo "Deployment"

    select_terraform_workspace
    export_variables_to_terraform
    pushd "${TERRAFORM_DIRECTORY}"
      ${TERRAFORM_CXX} apply -auto-approve
    popd
}

function terraform_destroy(){
  install_terraform_if_not_exists  
  select_terraform_workspace
  export_variables_to_terraform
  pushd "$TERRAFORM_DIRECTORY"
    $TERRAFORM_CXX  destroy -auto-approve
  popd
}


