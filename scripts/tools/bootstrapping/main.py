"""
  The script will be used to create terraform state bucket if does not exists
"""
from bootstrapping  import initial_terraform

if __name__ == "__main__":
    initial_terraform()