const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');

const s3 = new S3Client({ region: process.env.AWS_REGION });
const BUCKET = process.env.AWS_S3_BUCKET;

function s3Key(prefix, ext = '') {
  const d = new Date();
  const folder = `${d.getUTCFullYear()}/${String(d.getUTCMonth()+1).padStart(2,'0')}/${String(d.getUTCDate()).padStart(2,'0')}`;
  const rand = crypto.randomBytes(8).toString('hex');
  return `${prefix}/${folder}/${rand}${ext}`;
}

async function putToS3(Key, Body, ContentType) {
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key, Body, ContentType, ACL: 'private' }));
  return Key;
}

async function presign(Key, seconds = 900) {
  const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key }), { expiresIn: seconds });
  return url;
}

module.exports = { s3Key, putToS3, presign };
