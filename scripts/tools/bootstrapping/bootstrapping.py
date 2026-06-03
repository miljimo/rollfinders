"""
  The script will be used to create terraform state bucket if does not exists
"""
import time
import os
from typing import Optional, Any, Tuple
from enum import IntEnum
import boto3
from botocore.exceptions import ClientError
import logging
import subprocess

_logger: Optional[logging.Logger] = None


def create_logger() -> logging.Logger:
    global _logger
    if not _logger:
        _logger = logging.getLogger()
    return _logger


class TerraformTypes(IntEnum):
    TERRAFORM_ARTEFACT_BUCKET = 0x01


def create_s3_client(
    session: Optional[boto3.Session] = None,
) -> Tuple[Any, boto3.Session]:
    if session is None:
        raise ValueError("expecting a valid boto3 session")   
    return session.client("s3")


def get_environment_name()-> str:
   return subprocess.check_output(['git', 'rev-parse', '--abbrev-ref', 'HEAD']).decode('utf-8').strip()
        

def get_aws_account_id() -> str:
    """
    """
    try:
        sts_client = boto3.client('sts')
        response = sts_client.get_caller_identity()
        return response['Account']        
    except Exception as e:
        print(f"Error: {e}")

def get_bootstrapping_scoped_bucket_name(bucket_name:str)->str:
    """
     The function will create a bucket scope for the bucket name
     bucket_name  =  ${app_name}_${aws_account_id}_${bucket}
    """
    app_name:Optional[str] = os.environ.get("APP_NAME", None)
    account_id:str = get_aws_account_id()
    if app_name is None:
        return f"{account_id}-{bucket_name}"
    return f"{app_name}-{account_id}-{bucket_name}"


def check_bucket_exists(
    bucket_name: str,
    session: Optional[boto3.Session] = None
) -> bool:
    """
     Function check if the bucket exists or not.
    """
    s3_client = create_s3_client(session)
    try:
        s3_client.head_bucket(Bucket=bucket_name)
        return True
    except ClientError as err:
        if err.response["Error"]["Code"] == "404":
            return False

def create_terraform_state_bucket(
    session: Optional[boto3.Session],
    bucket_name: Optional[str],
    logger: Optional[logging.Logger] = None,
) -> bool:
    """
    """
    if not logger:
        logger = create_logger()

    s3_client = create_s3_client(session)
    # check if the bucket exist of not
    if check_bucket_exists(bucket_name=str(bucket_name), session=session):
        return True
    try:
            # bucket does not exists
            # create a new bucket for the current terraform bootstrapping   
            print(f"BUCKET NAME = {bucket_name}")        
            s3_client.create_bucket(
                Bucket=bucket_name,
                CreateBucketConfiguration={"LocationConstraint": session.region_name},
            )
            return True
    except ClientError as err:
            if err.response["Error"]["Code"] == "InvalidBucketName":
                logger.debug(f"Invalid bucket name provided {bucket_name}")
            logger.exception(err)
    return False

def dynamodb_table_exists(session: boto3.Session, table_name:str):
    dynamodb = session.client('dynamodb')
    try:
        dynamodb.describe_table(TableName=table_name)
        return True
    except dynamodb.exceptions.ResourceNotFoundException:
        return False
    except Exception as e:
        print(f"Error checking table existence: {e}")
        raise e


def create_terraform_dynamodb_state_table(session: boto3.Session, table_name:str):
    dynamodb = session.client('dynamodb')
    attribute_definitions = [
        {
            'AttributeName': 'LockID',
            'AttributeType': 'S'
        }
    ]

    key_schema = [
        {
            'AttributeName': 'LockID',
            'KeyType': 'HASH'
        }
    ]

    provisioned_throughput = {
        'ReadCapacityUnits': 5,
        'WriteCapacityUnits': 5
    }
    try:
        dynamodb.create_table(
            TableName=table_name,
            AttributeDefinitions=attribute_definitions,
            KeySchema=key_schema,
            ProvisionedThroughput=provisioned_throughput
        )
        return True
    except dynamodb.exceptions.ResourceInUseException:
        print(f"Table '{table_name}' already exists.")
        return True
    except Exception as e:
        print(f"error creating table: {e}")
    return False

def delete_dynamodb_table(session:boto3.Session, table_name:str):
    dynamodb = session.client('dynamodb')
    try:
        dynamodb.delete_table(TableName=table_name)
        time.sleep(2)
        return True
    except dynamodb.exceptions.ResourceNotFoundException:
        print(f"Table '{table_name}' does not exist.")
    except Exception as e:
        print(f"Error deleting table: {e}")
        raise e
    return False

def initial_terraform():
    session = boto3.Session()
    bucket_name = os.environ.get(TerraformTypes.TERRAFORM_ARTEFACT_BUCKET.name, None)
    bucket_scoped_name  =  get_bootstrapping_scoped_bucket_name(bucket_name)   
    status = create_terraform_state_bucket(session, bucket_scoped_name)
    
    if status:
        print("Bucket created successfully")
        dynamodb_terraform_table =  os.environ['TERRAFORM_STATES_TABLE']
        if dynamodb_table_exists(session, dynamodb_terraform_table):
            print(f"deleting dynamodb table = {dynamodb_terraform_table}")
            delete_dynamodb_table(session, dynamodb_terraform_table)

        status = create_terraform_dynamodb_state_table(session , table_name=dynamodb_terraform_table)
        if status:
            print(f"Table '{dynamodb_terraform_table}' created successfully.")
            print("BUCKET_NAME  = ", os.environ.get(TerraformTypes.TERRAFORM_ARTEFACT_BUCKET.name))