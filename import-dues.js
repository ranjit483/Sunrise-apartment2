"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var xlsx = require("xlsx");
var firestore_1 = require("firebase/firestore");
var firebase_1 = require("./src/config/firebase");
var auth_1 = require("firebase/auth");
var dotenv = require("dotenv");
dotenv.config({ path: '.env.local' });
function importDues() {
    return __awaiter(this, void 0, void 0, function () {
        var workbook, sheetName, worksheet, data, duesByUnit, i, row, unitNo, dueStr, dueAmount, usersRef, usersSnapshot, matched, updated, _i, _a, userDoc, userData, unitNumber, due;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    console.log('Signing in as admin...');
                    return [4 /*yield*/, (0, auth_1.signInWithEmailAndPassword)(firebase_1.auth, "ranjitmanaraja@gmail.com", "1234@manaR#")];
                case 1:
                    _c.sent();
                    console.log('Loading Excel...');
                    workbook = xlsx.readFile('sunrise Due Details soft.xlsx');
                    sheetName = workbook.SheetNames[1];
                    worksheet = workbook.Sheets[sheetName];
                    data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
                    duesByUnit = {};
                    for (i = 4; i < data.length; i++) {
                        row = data[i];
                        if (row && row.length >= 4) {
                            unitNo = (_b = row[1]) === null || _b === void 0 ? void 0 : _b.toString().trim();
                            dueStr = row[3];
                            dueAmount = parseFloat(dueStr);
                            if (isNaN(dueAmount))
                                dueAmount = 0;
                            if (unitNo) {
                                duesByUnit[unitNo] = dueAmount;
                            }
                        }
                    }
                    console.log("Found ".concat(Object.keys(duesByUnit).length, " unique units with due amounts in Excel."));
                    console.log('Fetching users from Firestore...');
                    usersRef = (0, firestore_1.collection)(firebase_1.db, 'users');
                    return [4 /*yield*/, (0, firestore_1.getDocs)(usersRef)];
                case 2:
                    usersSnapshot = _c.sent();
                    console.log("Found ".concat(usersSnapshot.size, " users in Firestore."));
                    matched = 0;
                    updated = 0;
                    _i = 0, _a = usersSnapshot.docs;
                    _c.label = 3;
                case 3:
                    if (!(_i < _a.length)) return [3 /*break*/, 6];
                    userDoc = _a[_i];
                    userData = userDoc.data();
                    unitNumber = userData.unitNumber;
                    if (!(unitNumber && duesByUnit.hasOwnProperty(unitNumber))) return [3 /*break*/, 5];
                    matched++;
                    due = duesByUnit[unitNumber];
                    console.log("Updating user ".concat(userData.fullName, " (Unit ").concat(unitNumber, ") with due amount: Rs ").concat(due));
                    return [4 /*yield*/, (0, firestore_1.updateDoc)((0, firestore_1.doc)(firebase_1.db, 'users', userDoc.id), {
                            previousPendingOutstandingDue: due
                        })];
                case 4:
                    _c.sent();
                    updated++;
                    _c.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 3];
                case 6:
                    console.log("Import complete! Matched ".concat(matched, " users and updated ").concat(updated, " documents."));
                    process.exit(0);
                    return [2 /*return*/];
            }
        });
    });
}
importDues().catch(console.error);
