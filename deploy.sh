echo "uploading files"
aws s3 sync --acl public-read --exact-timestamps ./public s3://hasudaclub-jr 
echo "complete."