#!/bin/bash

chmod +x ./scripts/utils.sh && . ./scripts/utils.sh
export ZIP_CXX=zip

function is_zip_installed(){
  local msg= $(command_exists $ZIP_CXX)
  local status=$?
  if [ $status != $SUCCESS ] ; then
    echo "zip tool not install/found"
  fi
  return $status
}

function install_zip_tool(){
  local msg=$(is_zip_installed)
  local status=$?
  if [ $status != $SUCCESS ] ; then
    echo "installing zip on system."
    sudo apt-get update -y
    sudo apt-get install -y zip 
    sudo apt-get install -y unzip
  fi
  return $?
}
