
const functions = require('firebase-functions');

// firestoreを利用するための設定
const { db } = require('../firestore')

// SendGridの初期設定
const sgMail = require('@sendgrid/mail');

// グローバル定数の呼び出し
const CONSTANTS = require('../lib/constants')



// 管理者フィードバック時の施設長宛メール送信機能
// 再発予防策/効果確認
exports.feedbackToFacility = functions
  .https.onCall(async (param, context) => {
  // ここにSendGridによるメール送信機能を実装する

    // 会社キーを新規事故データのcompanyから取得
    const company_key = context.auth.token.company_key
    // 引数payloadより、facility_key（施設キー）、事故データのドキュメントID（id）を切り出す
    const facility_key = param.match(/key=(.*)&id=/)[1]
    const id = param.match(/&id=(.*)/)[1]


    // ■　SendGrid設定
    // 送信元メールアドレス（0420_company 必要なのでこの位置）
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
    // フィードバック内容
    let manager_comment = ''
    // フィードバック記入者名
    let manager_name = ''


    // 事故データ取得
    // idに紐付いた事故データを取得
    await db
      .doc(`company/${company_key}/facility/${facility_key}/accidents/${id}`)
      .get()
      .then((doc) => {
        if (doc.exists) {
          // 事故データ取得
          accidents_data = doc.data()

          // ■　メールタイトルの設定
          // 状態ステータス値によって、メール送信タイトルを変更
          if(accidents_data.status === CONSTANTS.ACCIDENT_STATUS.p_manager_accept ) {
            // 再発予防策【承認(46)】の場合:
            mail_title = "再発予防策が【承認】されました。"
          } else if (accidents_data.status === CONSTANTS.ACCIDENT_STATUS.p_manager_remand ) {
            // 再発予防策【差し戻し(48)】の場合:
            mail_title = "再発予防策が【差し戻し】されました。"
          } else if (accidents_data.status === CONSTANTS.ACCIDENT_STATUS.e_manager_accept ) {
            // 効果確認【承認(76)】の場合:
            mail_title = "効果確認が【承認】されました。"
          } else if (accidents_data.status === CONSTANTS.ACCIDENT_STATUS.e_manager_remand ) {
            // 効果確認【差し戻し(78)】の場合:
            mail_title = "効果確認が【差し戻し】されました。"
          }


          // ■　フィードバックコンテンツの設定
          // 再発予防策、もしくは効果確認で取得データ異なる
          if(accidents_data.status === CONSTANTS.ACCIDENT_STATUS.p_manager_accept || accidents_data.status === CONSTANTS.ACCIDENT_STATUS.p_manager_remand) {
            // 再発予防策【承認(46)】、または【差し戻し(48)】の場合:
            staff_comment = (accidents_data.pre_staff_comment ? accidents_data.pre_staff_comment.replace(/\n/g, '<br>') : '')
            facility_comment = (accidents_data.pre_facility_comment ? accidents_data.pre_facility_comment.replace(/\n/g, '<br>') : '')
            manager_comment = (accidents_data.pre_manager_comment ? accidents_data.pre_manager_comment.replace(/\n/g, '<br>') : '')
            manager_name = (accidents_data.pre_manager_name ? accidents_data.pre_manager_name : '')

          } else if(accidents_data.status === CONSTANTS.ACCIDENT_STATUS.e_manager_accept || accidents_data.status === CONSTANTS.ACCIDENT_STATUS.e_manager_remand) {
            // 効果確認【承認(76)】、または【差し戻し(78)】の場合:
            staff_comment = (accidents_data.eff_staff_comment ? accidents_data.eff_staff_comment.replace(/\n/g, '<br>') : '')
            facility_comment = (accidents_data.eff_facility_comment ? accidents_data.eff_facility_comment.replace(/\n/g, '<br>') : '')
            manager_comment = (accidents_data.eff_manager_comment ? accidents_data.eff_manager_comment.replace(/\n/g, '<br>') : '')
            manager_name = (accidents_data.eff_manager_name ? accidents_data.eff_manager_name : '')
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


      // ■　施設アカウント情報の取得（送信先メールアドレス取得）
      const facility_info = await db.doc(`company/${company_key}/facility/${facility_key}`).get()
      // 施設アカウント情報取得エラー処理
      if (!facility_info.exists) {
        console.log('【managerApplicationMail】firestoreから施設アカウント情報の取得に失敗しました。');
        return
      } else {
        console.log('施設アカウント情報取得正常終了');
      }


      // ★　20220722_施設の送信メールを複数にするための実装を後日検討
      // 施設アカウント情報より、通知送信先メールアドレスを取得
      //送信先メール一覧格納変数
      let sendMailTo = []
      sendMailTo.push(facility_info.data().mail_address)

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
        subject: `${mail_title}`,
        html: `<br>${mail_title}<br>
              内容を確認してください。<br><br><br>

              ===========================<br>
              　　管理者フィードバック<br>
              ===========================<br>
              担当者：${manager_name}<br><br>
              ■　管理者コメント<br>
              ${manager_comment}<br><br><br>
              ====================<br>
              　　施設提出内容<br>
              ====================<br>
              担当者：${accidents_data.staff_name}<br><br>
              ■　現場スタッフコメント<br>
              ${staff_comment}<br><br>
              ■　施設長コメント<br>
              ${facility_comment}<br><br><br>
              ====================<br>
              　　ご利用者様情報<br>
              ====================<br>
              対象者：${accidents_data.user_name}様<br>
              年齢：${accidents_data.user_age}<br>
              介護度：${care_level_name}<br>          
              認知症高齢者の生活自立度：${dementia_name}<br><br>            
              ====================<br>
              　　事故内容<br>
              ====================<br>
              事故タイトル：${accidents_data.title}<br>
              発生日時：${accidents_data.date} ${accidents_data.time}頃<br>
              担当者：${accidents_data.staff_name}<br>
              発生場所：${place_name}<br>
              事故種別：${type_name}<br><br><br>
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
                施設名：${facility_info.data().name}<br>
                事故タイトル：${accidents_data.title}<br>
                発生日時：${accidents_data.date} ${accidents_data.time}頃<br>
                発生場所：${place_name}<br>
                事故種別：${type_name}<br><br>
                ====================<br>
                ■　提出内容<br>
                ====================<br>
                担当者：${accidents_data.staff_name}<br><br>
                ${staff_comment}<br><br><br>
                ${manager_comment}<br><br><br>
                ${manager_name}<br><br><br>
                `
        }
        // SendGridでメール送信
        await sgMail.send(err_msg)
        // フロント側にはエラーを返して終了
        throw "[feedbackToFacility.js]管理者フィードバックの施設長宛の通知メールでエラーが発生しました。"
      }
      // ★0419_ここから追記 END

  })


