<!-- 事故報告管理システムのfirebase cloudfunctionsのファイル・メソッド構成 -->


firestore.js
  cloudfunction内でfirestoreにアクセスするための設定


index.js
  作成したメソッドのexport 

  src/
    accidentsStatus.js
      ・管理者提出時の管理者宛メール送信機能
      ・取り下げ時の管理者宛メール通知

    base.js
      最初に作成していたファイル。これは読み込んでいないので削除する予定(2021年12月24日)

    firestoreTrigger.js
      firestoreトリガーからのfunction実行。
      ・事故データ新規登録時のメール通知

    










