
const functions = require('firebase-functions');

// firestoreを利用するための設定
const { db } = require('../firestore')

// SendGridの初期設定
const sgMail = require('@sendgrid/mail');

// グローバル定数の呼び出し
const CONSTANTS = require('../lib/constants')



// 管理者提出時の管理者宛メール送信機能
// 再発予防策/効果確認
// 引数：渡された更新された事故データのドキュメントID
exports.applyToManager = functions
  .https.onCall(async (id, context) => {
  // ここにSendGridによるメール送信機能を実装する

    // // 会社キーを新規事故データのcompanyから取得
    // const company = data.company
    // // 施設アカウントキー
    // const key = data.key

    // 会社キー[company_key]・施設キー[facility_key]のセット
    const company_key = context.auth.token.company_key
    const facility_key = context.auth.token.facility_key


    // ■　SendGrid設定
    // 送信元メールアドレス
    const sender_mail = functions.config()[company_key.toLowerCase()]['sendgrid']['sender_mail']
    // firebaseの環境変数に設定したSendGridのAPIキーを設定
    sgMail.setApiKey(functions.config()[company_key.toLowerCase()]['sendgrid']['apikey']);    

    // firestore から再度取得する更新された事故データ格納変数
    let accidents_data = {}
    // メール送信タイトル
    let mail_title = ''
    // 現場スタッフコメント
    let staff_comment = ''
    // 施設長コメント
    let facility_comment = ''    


    // 事故データ取得
    // idに紐付いた事故データを取得
    await db
      .doc(`company/${company_key}/facility/${facility_key}/accidents/${id}`)
      .get()
      .then((doc) => {
        if (doc.exists) {
          // 事故データ取得
          accidents_data = doc.data()

          // 状態ステータス値によって、メール送信タイトルを変更
          if(accidents_data.status === CONSTANTS.ACCIDENT_STATUS.p_manager_apply ) {
            // メールタイトル設定
            mail_title = "【再発予防策】が提出されました。"
            // 再発予防策の提出内容
            staff_comment = (accidents_data.pre_staff_comment ? accidents_data.pre_staff_comment.replace(/\n/g, '<br>') : '')
            facility_comment = (accidents_data.pre_facility_comment ? accidents_data.pre_facility_comment.replace(/\n/g, '<br>') : '')

          } else if (accidents_data.status === CONSTANTS.ACCIDENT_STATUS.e_manager_apply ) {
            // メールタイトル設定
            mail_title = "【効果確認】が提出されました。"
            // 効果確認の提出内容
            staff_comment = (accidents_data.eff_staff_comment ? accidents_data.eff_staff_comment.replace(/\n/g, '<br>') : '')
            facility_comment = (accidents_data.eff_facility_comment ? accidents_data.eff_facility_comment.replace(/\n/g, '<br>') : '')
          }

        } else {
          // doc.data() will be undefined in this case
          console.log("事故データが見つからなかったため、管理者へメールが送信されませんでした。", id);
          return
        }
      })
      .catch((error) => {
          console.log("Error getting documents: ", error);
      });


    // 施設アカウント情報の取得
    const facility_info = await db.doc(`company/${company_key}/facility/${facility_key}`).get()
    // 施設アカウント情報取得エラー処理
    if (!facility_info.exists) {
      console.log('【managerApplicationMail】firestoreから施設アカウント情報の取得に失敗しました。');
      return
    }


    // ■　管理者アカウント情報より送信先メール一覧を取得
    //送信先メール一覧格納変数
    let sendMailTo = []
    // ※　【0720_仕様変更】accountsアカウントコレクションには、MANAGERのみになったので、このwhere分は不要になった。
    // 管理者アカウントのcollection
    const accountsRef = db.collection('accounts').where("company_key", "==", company_key);
    // 施設アカウント情報の一覧より、通知送信先メールアドレスとして設定されているアカウント情報を取得
    const snapshot = await accountsRef.get();
    // 取得したManagerアカウントデータをループ処理
    snapshot.forEach(doc => {
      // 管理者アカウント情報
      const managerAccount = doc.data()
      // receiving_mail_targetに, loginIDが含まれる場合は、管理者の通知メールを追加
      if( managerAccount.receiving_mail_target.includes(facility_key) ) {
        // ここで送信先メール一覧を作成
        sendMailTo.push(managerAccount.mail_address)
      }    
    });

    // 重複するメールアドレスの削除
    sendMailTo = [...new Set(sendMailTo)]
    // 送信先メール一覧
    console.log(`sendMailTo: ${sendMailTo}`)

    // sendMailToが無し(空)の場合、処理終了
    if(!sendMailTo.length) return    


    // ■　表示項目の設定開始
    // 発生場所  
    let place_name = []
    // 発生場所が入力されているとき
    if(accidents_data.place.selected) {
      accidents_data.place.selected.forEach(val => {
        let temp = CONSTANTS.ACCIDENT_PLACE.find(place_list => place_list.id === val )
        place_name.push(temp.p_name)
      })
      // 発生場所が入力されていないとき
    } else {
      place_name = '未設定'
    }

    // 事故種別
    let type_name = []
    // 発生場所が入力されているとき
    if(accidents_data.type.selected) {
      accidents_data.type.selected.forEach(val => {
        let temp = CONSTANTS.ACCIDENT_TYPE.find(type_list => type_list.id === val )
        type_name.push(temp.t_name)
      })
      // 発生場所が入力されていないとき
    } else {
      type_name = '未設定'
    }

    // 管理者連絡
    const manager_contact = accidents_data.manager_contact_status ? `連絡済み（${accidents_data.manager_name}）` : '未連絡'

    // 介護度の表示形式を変換
    const care_level = CONSTANTS.CARE_LEVEL.find(val => val.id === accidents_data.care_level)  
    const care_level_name = care_level ? care_level.c_name : '未登録'    

    // 認知症高齢者の生活自立度
    const dementia = CONSTANTS.DEMENTIA.find(val => val.id === accidents_data.dementia)
    const dementia_name = dementia ? dementia.d_name : '未登録'
    // ■　表示項目の設定終了


    // ■■■　SendGridによるメール送信設定
    const msg = {
      to: sendMailTo,
      from: sender_mail,
      subject: `【${facility_info.data().name}】${mail_title}`,
      html: `<br>${mail_title}<br>
            内容を確認し、承認してください。<br><br><br>

            ====================<br>
            　　施設提出内容<br>
            ====================<br>
            担当者：${accidents_data.staff_name}<br><br>
            ■　現場スタッフコメント<br>
            ${staff_comment}<br><br>
            ■　施設長コメント<br>
            ${facility_comment}<br><br><br>
            ====================<br>
            ■　ご利用者様情報<br>
            ====================<br>
            所属施設：${facility_info.data().name}<br>
            対象者：${accidents_data.user_name}様<br>
            年齢：${accidents_data.user_age}<br>
            介護度：${care_level_name}<br>          
            認知症高齢者の生活自立度：${dementia_name}<br><br>            
            ====================<br>
            ■　事故内容<br>
            ====================<br>
            事故タイトル：${accidents_data.title}<br>
            発生日時：${accidents_data.date} ${accidents_data.time}頃<br>
            担当者：${accidents_data.staff_name}<br>            
            発生場所：${place_name}<br>
            事故種別：${type_name}<br>
            管理者連絡：${manager_contact}<br><br><br>          
            `
    }

    // SendGridでメール送信実行
    try {
      await sgMail.send(msg)
    } catch (error) {
      // エラーメッセージ送信先メールアドレス
      // configの会社名.admin_mail
      const admin_mail = functions.config()[company_key.toLowerCase()]['sendgrid']['admin_mail']
      // エラーメッセージ内容設定
      const err_msg = {
        to: admin_mail,
        from: sender_mail,
        subject: `【SendGridメール送信エラー】`,
        html: `SnedGrid送信時にエラーが発生しました。<br>
              エラー場所：${mail_title}<br>
              エラーコード：${error.code}<br><br><br>
              送信予定だったメールリスト：${sendMailTo}<br><br>
              ====================<br>
              ■　事故情報<br>
              ====================<br>
              施設名：${facility_info.data().name}}<br>
              事故タイトル：${accidents_data.title}<br>
              発生日時：${accidents_data.date} ${accidents_data.time}頃<br>
              発生場所：${place_name}<br>
              事故種別：${type_name}<br><br>
              ====================<br>
              　　施設提出内容<br>
              ====================<br>
              担当者：${accidents_data.staff_name}<br><br>
              ■　現場スタッフコメント<br>
              ${staff_comment}<br><br>
              ■　施設長コメント<br>
              ${facility_comment}<br><br><br>
              `
      }
      // SendGridでメール送信
      await sgMail.send(err_msg)
      // フロント側にはエラーを返して終了
      throw "[applyToManager.js]品質管理部提出の通知メールでエラーが発生しました。"
    }
  })



// 取り下げ時の管理者宛メール通知
// 再発予防策/効果確認 取り下げ
// ※　引数id 更新された事故データのdocID
exports.applyToManagerWithdraw = functions
  .https.onCall(async (id, context) => {
    // 会社キー[company_key]・施設キー[facility_key]のセット
    const company_key = context.auth.token.company_key
    const facility_key = context.auth.token.facility_key 

    // ■　SendGrid設定
    // 送信元メールアドレス
    const sender_mail = functions.config()[company_key.toLowerCase()]['sendgrid']['sender_mail']
    // firebaseの環境変数に設定したSendGridのAPIキーを設定
    sgMail.setApiKey(functions.config()[company_key.toLowerCase()]['sendgrid']['apikey']);


    // firestore から再度取得する更新された事故データ格納変数
    let accidents_data = {}
    // メール送信タイトル
    let mail_title = ''

    // 事故データ取得
    // 引数のidに紐付いた事故データを取得
    await db
      .doc(`company/${company_key}/facility/${facility_key}/accidents/${id}`)
      .get()
      .then((doc) => {
        if (doc.exists) {
          // 事故データ取得
          accidents_data = doc.data()

          // 状態ステータス値によって、メール送信タイトルを変更
          if(accidents_data.status === CONSTANTS.ACCIDENT_STATUS.p_input ) {
            // 再発予防策のメールタイトル設定
            mail_title = "再発予防策の提出が取り下げられました。"
          } else if (accidents_data.status === CONSTANTS.ACCIDENT_STATUS.e_input ) {
            // 効果確認のメールタイトル設定
            mail_title = "効果確認の提出が取り下げられました。"
          }

        } else {
          // doc.data() will be undefined in this case
          console.log("事故データが見つからなかったため、管理者へメールが送信されませんでした。", id);
          return
        }
      })
      .catch((error) => {
          console.log("Error getting documents: ", error);
      });

    
    // 施設アカウント情報の取得
    const facility_info = await db.doc(`company/${company_key}/facility/${facility_key}`).get()    
    // 施設アカウント情報取得エラー処理
    if (!facility_info.exists) {
      console.log('【managerApplicationMail】firestoreから施設アカウント情報の取得に失敗しました。');
      return
    } else {
      console.log('施設アカウント情報取得正常終了');
    }


    // ■　管理者アカウント情報より送信先メール一覧を取得
    //送信先メール一覧格納変数
    let sendMailTo = []
    // ※　【0720_仕様変更】accountsアカウントコレクションには、MANAGERのみになったので、このwhere分は不要になった。
    // 管理者アカウントのcollection
    const accountsRef = db.collection('accounts').where("company_key", "==", company_key);
    // 施設アカウント情報の一覧より、通知送信先メールアドレスとして設定されているアカウント情報を取得
    const snapshot = await accountsRef.get();
    // 取得したManagerアカウントデータをループ処理
    snapshot.forEach(doc => {
      // 管理者アカウント情報
      const managerAccount = doc.data()
      // receiving_mail_targetに, loginIDが含まれる場合は、管理者の通知メールを追加
      if( managerAccount.receiving_mail_target.includes(facility_key) ) {
        // ここで送信先メール一覧を作成
        sendMailTo.push(managerAccount.mail_address)
      }    
    });

    // 重複するメールアドレスの削除
    sendMailTo = [...new Set(sendMailTo)]
    // 送信先メール一覧
    console.log(`sendMailTo: ${sendMailTo}`)

    // sendMailToが無し(空)の場合、処理終了
    if(!sendMailTo.length) return


    // ■　表示項目の設定開始
    // 発生場所
    let place_name = []
    // 発生場所が入力されているとき
    if(accidents_data.place.selected) {
      accidents_data.place.selected.forEach(val => {
        let temp = CONSTANTS.ACCIDENT_PLACE.find(place_list => place_list.id === val )
        place_name.push(temp.p_name)
      })
      // 発生場所が入力されていないとき
    } else {
      place_name = '未設定'
    }

    // 事故種別
    let type_name = []
    // 発生場所が入力されているとき
    if(accidents_data.type.selected) {
      accidents_data.type.selected.forEach(val => {
        let temp = CONSTANTS.ACCIDENT_TYPE.find(type_list => type_list.id === val )
        type_name.push(temp.t_name)
      })
      // 発生場所が入力されていないとき
    } else {
      type_name = '未設定'
    }

    // 管理者連絡
    const manager_contact = accidents_data.manager_contact_status ? `連絡済み（${accidents_data.manager_name}）` : '未連絡'

    // 介護度の表示形式を変換
    const care_level = CONSTANTS.CARE_LEVEL.find(val => val.id === accidents_data.care_level)
    const care_level_name = care_level ? care_level.c_name : '未登録'

    // 認知症高齢者の生活自立度
    const dementia = CONSTANTS.DEMENTIA.find(val => val.id === accidents_data.dementia)
    const dementia_name = dementia ? dementia.d_name : '未登録'
    // ■　表示項目の設定終了


    // ■■■　SendGridによるメール送信設定
    const msg = {
      to: sendMailTo,
      from: sender_mail,
      subject: `${facility_info.data().name}: ${mail_title}`,
      html: `<br>${mail_title}<br>
            再提出されるまで待ってください。<br><br><br>
            ====================<br>
            ■　ご利用者様情報<br>
            ====================<br>
            所属施設：${facility_info.data().name}<br>
            対象者：${accidents_data.user_name}様<br>
            年齢：${accidents_data.user_age}<br>
            介護度：${care_level_name}<br>          
            認知症高齢者の生活自立度：${dementia_name}<br><br>            
            ====================<br>
            ■　事故内容<br>
            ====================<br>
            事故タイトル：${accidents_data.title}<br>
            担当者：${accidents_data.staff_name}<br>
            発生日時：${accidents_data.date} ${accidents_data.time}頃<br>
            発生場所：${place_name}<br>
            事故種別：${type_name}<br>
            管理者連絡：${manager_contact}<br><br><br>
            ` 
    }

    // SendGridでメール送信実行    
    try {
      await sgMail.send(msg)
    } catch (error) {
      // エラーメッセージ送信先メールアドレス
      // configの会社名.admin_mail
      const admin_mail = functions.config()[company_key.toLowerCase()]['sendgrid']['admin_mail']
      // エラーメッセージ内容設定
      const err_msg = {
        to: admin_mail,
        from: sender_mail,
        subject: `【SendGridメール送信エラー】`,
        html: `SnedGrid送信時にエラーが発生しました。<br>
              エラー場所：${mail_title}<br>
              エラーコード：${error.code}<br><br><br>
              送信予定だったメールリスト：${sendMailTo}<br><br>             
              ====================<br>
              ■　事故情報<br>
              ====================<br>
              施設名：${facility_info.data().name}}<br>
              事故タイトル：${accidents_data.title}<br>
              発生日時：${accidents_data.date} ${accidents_data.time}頃<br>
              発生場所：${place_name}<br>
              事故種別：${type_name}<br><br>             
              `
      }
      // SendGridでメール送信
      await sgMail.send(err_msg)
      // フロント側にはエラーを返して終了
      throw "[applyToManager.js]品質管理部提出の通知メールでエラーが発生しました。"
    }

  })

