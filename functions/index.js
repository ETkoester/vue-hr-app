/* eslint-disable @typescript-eslint/no-var-requires */
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { logger } = require("firebase-functions");

const admin = require("firebase-admin");
const {
    get,
    query,
    ref,
    orderByChild,
    equalTo,
    update,
} = require("firebase/database");
admin.initializeApp({
    databaseURL: "https://xxxxxxx-rtdb.asia-southeast1.firebasedatabase.app/",
});

const database = admin.database();

const express = require("express");
const { onRequest } = require("firebase-functions/v2/https");
const cookieParser = require("cookie-parser")();
const cors = require("cors")({ origin: true });
const app = express();

const validateFirebaseIdToken = async (req, res, next) => {
    logger.log("Check if request is authorized with Firebase ID token");

    if (
        (!req.headers.authorization ||
            !req.headers.authorization.startsWith("Bearer ")) &&
        !(req.cookies && req.cookies.__session)
    ) {
        logger.error(
            "No Firebase ID token was passed as a Bearer token in the Authorization header.",
            "Make sure you authorize your request by providing the following HTTP header:",
            "Authorization: Bearer <Firebase ID Token>",
            'or by passing a "__session" cookie.',
        );
        res.status(403).send("Unauthorized");
        return;
    }

    let idToken;
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer ")
    ) {
        logger.log('Found "Authorization" header');
        // Read the ID Token from the Authorization header.
        idToken = req.headers.authorization.split("Bearer ")[1];
    } else if (req.cookies) {
        logger.log('Found "__session" cookie');
        // Read the ID Token from cookie.
        idToken = req.cookies.__session;
    } else {
        // No cookie
        res.status(403).send("Unauthorized");
        return;
    }

    try {
        const decodedIdToken = await admin.auth().verifyIdToken(idToken);
        logger.log("ID Token correctly decoded", decodedIdToken);
        req.user = decodedIdToken;
        next();
        return;
    } catch (error) {
        logger.error("Error while verifying Firebase ID token:", error);
        res.status(403).send("Unauthorized");
        return;
    }
};

app.use(cors);
app.use(cookieParser);
app.use(validateFirebaseIdToken);
app.post("/createUser", async (req, res) => {
    if (!req.body.email || !req.body.password) {
        res.status(400).send({ details: "請輸入電郵和密碼" });
        return;
    }
    let userRecord = {};
    try {
        userRecord = await admin.auth().createUser({
            email: req.body.email,
            password: req.body.password,
        });
    } catch (error) {
        logger.log("創建用戶失敗:", error);
        res.status(400).send({ details: error });
        return;
    }
    logger.log("成功創建用戶:", userRecord.uid);
    res.status(200).send({ uid: userRecord.uid });
});

app.post("/deleteUser", async (req, res) => {
    if (!req.body.uid) {
        res.status(400).send({ details: "請輸入用戶ID" });
        return;
    }
    try {
        await admin.auth().deleteUser(req.body.uid);
    } catch (error) {
        logger.log("刪除用戶失敗:", error);
        res.status(400).send({ details: error });
        return;
    }
    logger.log("成功刪除用戶:", req.body.uid);
    res.status(200).send({ details: "success" });
});

exports.app = onRequest(app);

exports.autoPunchOut = onSchedule("every 1 minutes", async () => {
    const userInfoRef = await get(
        query(
            ref(database, `users/info`),
            orderByChild("empType"),
            equalTo("ft"),
        ),
    );
    if (userInfoRef.val() == undefined) return;

    let today = new Date();
    today = new Date(today.getTime() + 480 * 60 * 1000);
    const datetime = today.toISOString().split("T");
    const date = datetime[0];
    const time = datetime[1].slice(0, 5);

    const idList = [];
    const empRosterMap = {};
    for (const uid in userInfoRef.val()) {
        const rosterRef = await get(
            ref(database, `users/roster/${uid}/${date}`),
        );
        if (rosterRef.val() == undefined || rosterRef.val().end >= time)
            continue;
        const attdRef = await get(
            ref(database, `users/attendance/${uid}/${date}`),
        );
        if (
            attdRef.val() == undefined ||
            !attdRef.val().workTime ||
            attdRef.val().leaveTime
        )
            continue;
        idList.push(uid);
        empRosterMap[uid] = rosterRef.val().end;
    }
    if (idList.length <= 0) return;

    while (idList.length > 0) {
        const empId = idList.pop();
        if (empId == undefined) break;
        await update(ref(database, `users/attendance/${empId}/${date}`), {
            leaveTime: empRosterMap[empId],
            leaveType: "正常",
        });
        logger.log(`員工ID ${empId} 已於 ${date} ${time} 自動打卡`);
    }
});
