const admin = require('firebase-admin');

admin.initializeApp();
// const firestore = admin.firestore();
const db = admin.firestore();

// adminは、サーバータイムの取得、およびarrayUnionの設定に必要
module.exports = {
  admin,
  // firestore,
  db,
};


