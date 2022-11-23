
// // ※0218追記 バックアップ
// const backup = require('./src/backup')

const firestoreTrigger = require('./src/firestoreTrigger')
const applyToManager = require('./src/applyToManager')
const replyToFacility = require('./src/replyToFacility')

// // ※0218追記
// exports.scheduledFirestoreExport = backup.scheduledFirestoreExport;


// テストファンクション
exports.testFunction = firestoreTrigger.testFunction;

// firestoreへの新規登録トリガー
exports.newAccidentAlertMail = firestoreTrigger.newAccidentAlertMail;

// フロント呼び出しトリガー
// 品質管理部提出用メール
exports.applyToManager = applyToManager.applyToManager;
exports.applyToManagerWithdraw = applyToManager.applyToManagerWithdraw;
// 管理者フィードバック後の施設長宛の通知メール
exports.feedbackToFacility = replyToFacility.feedbackToFacility;

