#!/bin/bash
chmod +x ./scripts/utils.sh && . ./scripts/utils.sh
export AWS_LINUX_PACKAGE=awscli

function is_aws_cli_installed(){
  # Function check if the aws-cli is installed (TESTED)
  local msg=$(command_exists $AWS_CLI_XX)
  local status=$?

  if [ $status != $SUCCESS ] ; then
     echo "error: aws cli is not installed, $msg"
  fi
  return $status
}


function install_aws_cli(){
  # Function install the aws cli if its not available (Tested)
  local msg=$(is_aws_cli_installed)
  local status=$?
  if [ $status != $SUCCESS ] ; then
     #install the aws cli
     apt-get update -y
     apt-get install -y "${AWS_LINUX_PACKAGE}"
  fi

  local version=$(aws --version)   
  echo "AWS CLI installed , version=${version}"
}

function get_aws_account_id() {
  local msg=$(is_aws_cli_installed)
  local status=$?
  if [ $status != $SUCCESS ] ; then
    echo "AWS CLI is not installed. Please install it first."
     return 1
  fi
  echo $($AWS_CLI_XX sts get-caller-identity --output text --query 'Account')
}

function upload_zip_file_to_s3(){
  local zip_filename="$1"
  local bucket_name="$2"
  bucket_name="${bucket_name//\"/}"

  file_exists "$zip_filename"
  local status=$?
  if [ $status != $SUCCESS ]; then
     echo "$zip_filename package file does not exist."
     return $FAILURE
  fi

  local temp_dir=$(mktemp -d)
  local filename=$(basename "$zip_filename" .zip)
  # unzip into a temp directory
  unzip -q "$zip_filename" -d "$temp_dir"
  $AWS_CLI_XX s3 sync "$temp_dir" "s3://$bucket_name/"
  # clean up
  rm -r $temp_dir
  echo "Application deployed to s3://$bucket_name"
  return $SUCCESS
}