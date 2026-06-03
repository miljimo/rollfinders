# Amazon Simple Storage Service (Amazon S3)
 Amazon Simple Storage Service (S3), is an object storage service that offers industry-leading scalability , data availability , security and performance to customers of any size.

In S3 , object are treated as file with folder structures , the object location in S3 is regards as object_key which simply means file path.

 Amazon S3 can be used for the following use cases:

 #### Use Cases
 - Data lakes
 - Static website hosting
 - Data backups/ data restore
 - Archives
 - Big data analytics


##### Table of Contents
- [Overview](#Overview)
    - [Storage Classes](#StorageClasses)
        - [S3 Standard](#Standard)
    - [Storage Management](#StorageManagments)
        - [S3 Lifecycle Configuration](#LifeCycleConfig)
            - [S3 Lifecycle Transition](#LifeCycleConfig)
            - [S3 Lifecycle Configuration](#LifeCycleConfig)
        - [S3 Object Lock](#LifeCycleConfig)
        - [S3 Replication](#LifeCycleConfig)
        - [S3 Batch Operations](#LifeCycleConfig)

    - [Access & Security Management](#AccessSecurityManagement)
    - [Data Processing](#DataProcessing)
    - [Storage Logging and Monitoring](#StorageLoggingMonitoring)
- [Amazon S3 Transfer Acceleration](#TransferAcceleration)
- [S3 Modules & Examples](#S3Modules)
- [S3 Use Cases & Architectures Provision](ArchitectureAndUsecases)
- [References](#References)

## Overview
This module is configured to use the best practice for default provisioning of an S3 storage bucket. This behave is extended to all the storage classes of the S3 buckets. 

### Storage Classes
 Amazon S3 offer different range of storage classes depending on your use cases. Choosing the right S3 Storage can help to reduce cost and improved your workload performance. This will enable you to meet the famous [AWS Well-Architected Framework](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html)".

### S3 Standard
  
  |Operations| Price | Size Type | Rate | others |
  |----|----|----|---|--|
  | Storage | £0.00032 | First 50 Terabytes | per month |   |
  | PUT,COPY,POST | £0.0040 | 1000 | operations | 1million operations = £4.0 |
  | GET, SELECT | £0.00032 | 1000 | operations |  1million operations = £3.2 |

   Read more about Amazon S3 pricing [here](https://aws.amazon.com/s3/pricing/?nc=sn&loc=4)



### Storage Management


####  S3 Lifecycle Configuration
 The lifecycle management
 

### Access & Security Management
Amazon provides features for auditing and managing access to your S3 objects. This provide one the ability to configured

- Block Public Access :  By default this feature is disabled , but you have the optional control to configure who can publicly access your bucket objects.
- Bucket Policies :  Amazon allow you to control and use (Identity Access Management) IAM roles and policy to configure resource-base permissions for the S3 bucket and its objects.
- Access control list (ACLs): You can configure a named network endpoints with dedicated access policies to manage data access at scale for shared datasets in Amazon S3. 
- Amazon Object Ownerships:  This allow you to own and disable and enable ACLs , however by defaults Amazon disabled it.




