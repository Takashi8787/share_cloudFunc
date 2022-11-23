const functions = require('firebase-functions');
const firestore = require('@google-cloud/firestore');
const client = new firestore.v1.FirestoreAdminClient();

// グローバル定数の呼び出し
const CONSTANTS = require('../lib/constants')

// Replace BUCKET_NAME
const bucket = CONSTANTS.BUCKET


// ★　2022/0705_ここは環境変数（process.envの辺りを見直す必要があり。飛ばし

exports.scheduledFirestoreExport = functions.pubsub
                                            // .schedule('every 24 hours')
                                            // アメリカ時間9時45分（日本時間2:45）に設定
                                            .schedule('45 9 * * *')
                                            .onRun((context) => {
  const projectId = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT;
  const databaseName =
    client.databasePath(projectId, '(default)');

  return client.exportDocuments({
    name: databaseName,
    outputUriPrefix: bucket,
    // Leave collectionIds empty to export all collections
    // or set to a list of collection IDs to export,
    // collectionIds: ['users', 'posts']
    collectionIds: []
    })
  .then(responses => {
    const response = responses[0];
    console.log(`Operation Name: ${response['name']}`);
  })
  .catch(err => {
    console.error(err);
    throw new Error('Export operation failed');
  });
});
