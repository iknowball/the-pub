const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.sendWallPostEmail = functions.firestore
  .document("walls/{userId}/posts/{postId}")
  .onCreate(async (snap, context) => {
    const postData = snap.data();
    const userId = context.params.userId;

    // Fetch profile owner's email (assume it's stored in 'users/{userId}/email')
    const userDoc = await admin.firestore().collection("users").doc(userId).get();
    const recipientEmail = userDoc.data().email;

    // Prepare email document for Firebase SendGrid extension
    await admin.firestore().collection("mail").add({
      to: [recipientEmail],
      message: {
        subject: "New post on your wall!",
        text: `${postData.authorName} posted: "${postData.content}"`,
        html: `<p><strong>${postData.authorName}</strong> posted on your wall:</p><p>${postData.content}</p>`
      }
    });
  });
