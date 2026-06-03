#!/usr/bin/bash
# Bucket deployment of lambda function code and utils
# https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-package.html



chmod +x ./scripts/zip_utils.sh && . ./scripts/zip_utils.sh

export APP_DISTRIBUTION_FOLDER=dist
export PROJECT_BIN_FOLDER=./bin
export PACKAGED_FOLDER=package
export APPLICATION_DEPLOYMENT_PACKAGE_FILE="packaged_file.zip"


function create_zip_package_file(){
  local folder="$1"
  local msg=$(folder_exists $folder)
  local status=$?
  # check if the application has distributed folders or not.
  if [ $status != $SUCCESS ]; then 
    return $status
  fi


  local project_zip_folder="$PROJECT_BIN_FOLDER/$PACKAGED_FOLDER"

  $(folder_exists "$project_zip_folder")
  local status=$?
  if [ $status == $SUCCESS ] ; then
      echo "deleting project folder $project_zip_folder"
      rm -r "$project_zip_folder"
  fi

  mkdir -p "$project_zip_folder"

  root_dir=$(pwd)
  pushd $project_zip_folder
    local current_dir=$(pwd)
    ln -sf  "${root_dir}/$folder"
   
    pushd "${current_dir}/${folder}"
      local dist_current_dir=$(pwd)
      zip -r  "${APPLICATION_DEPLOYMENT_PACKAGE_FILE}" .
    popd
  popd

  local zip_filename="${project_zip_folder}/${APP_DISTRIBUTION_FOLDER}/${APPLICATION_DEPLOYMENT_PACKAGE_FILE}"
  file_exists "$zip_filename"
  status=$?
  if [ $status == $SUCCESS ] ; then
    mv  "$zip_filename" "${PROJECT_BIN_FOLDER}"
    echo "Zip packaged file save to:  ${PROJECT_BIN_FOLDER}/${APPLICATION_DEPLOYMENT_PACKAGE_FILE}"
  fi
  rm -r "$project_zip_folder"
  export PACKAGED_ZIP_FILENAME="${PROJECT_BIN_FOLDER}/${APPLICATION_DEPLOYMENT_PACKAGE_FILE}"
  return $SUCCESS
}

