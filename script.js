import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue, update, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyCrKe-txuLseoT5aoUcmIRlhLGLOtVSXqU",
    authDomain: "romeo-helper.firebaseapp.com",
    databaseURL: "https://romeo-helper-default-rtdb.firebaseio.com",
    projectId: "romeo-helper",
    storageBucket: "romeo-helper.firebasestorage.app",
    messagingSenderId: "403449463454",
    appId: "1:403449463454:web:75b5c41df9dde8c859718f",
    measurementId: "G-16R73CSTDX"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let currentRoom = "";
let myName = "";
let players = [];

// DOM 요소
const loginScreen = document.getElementById('login-screen');
const gameScreen = document.getElementById('game-screen');
const container = document.getElementById('platforms-container');

// 1. 방 입장
document.getElementById('btn-join').onclick = () => {
    currentRoom = document.getElementById('room-name').value.trim();
    myName = document.getElementById('user-name').value.trim();

    if (!currentRoom || !myName) return alert("방 이름과 닉네임을 입력하세요.");

    // 입장 정보 등록
    const playerRef = ref(db, `rooms/${currentRoom}/players/${myName}`);
    set(playerRef, { name: myName, timestamp: Date.now() });

    loginScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    document.getElementById('display-room-name').innerText = `방: ${currentRoom}`;
    
    initRealtime();
};

// 2. 실시간 데이터 감시
function initRealtime() {
    const roomRef = ref(db, `rooms/${currentRoom}`);
    
    onValue(roomRef, (snapshot) => {
        const data = snapshot.val() || {};
        const playersData = data.players || {};
        const selectionData = data.selections || {};
        
        players = Object.values(playersData).sort((a, b) => a.timestamp - b.timestamp);
        
        // 상단 정보 업데이트
        document.getElementById('display-user-count').innerText = `인원: ${players.length}/4명`;
        document.getElementById('party-list').innerText = `파티원: ${players.map(p => p.name).join(', ')}`;

        // 4명 미만이면 대기 메시지, 4명이면 렌더링
        if (players.length < 4) {
            container.innerHTML = "<h3>파티원 4명을 기다리는 중입니다...</h3>";
        } else {
            renderPlatforms(selectionData);
        }
    });
}

// 3. 발판 렌더링
function renderPlatforms(selections) {
    container.innerHTML = "";
    
    // 10층부터 1층까지 생성
    for (let f = 10; f >= 1; f--) {
        const row = document.createElement('div');
        row.className = 'floor-row';
        row.innerHTML = `<div class="floor-label">${f}F</div>`;
        
        const platWrapper = document.createElement('div');
        platWrapper.className = 'platforms';

        for (let p = 1; p <= 4; p++) {
            const btn = document.createElement('div');
            btn.className = 'platform';
            const key = `${f}-${p}`;
            const owner = selections[key];

            if (owner) {
                btn.innerText = owner;
                if (owner === myName) {
                    btn.classList.add('my-pick');
                } else {
                    btn.classList.add('other-pick', 'disabled');
                }
            }

            btn.onclick = () => togglePlatform(f, p, owner, selections);
            platWrapper.appendChild(btn);
        }
        row.appendChild(platWrapper);
        container.appendChild(row);
    }
}

// 4. 발판 클릭 로직
function togglePlatform(floor, platNum, owner, selections) {
    const key = `${floor}-${platNum}`;

    // 1. 이미 남이 선택한 곳이면 무시
    if (owner && owner !== myName) return;

    // 2. 이미 내가 선택한 곳이면 취소
    if (owner === myName) {
        remove(ref(db, `rooms/${currentRoom}/selections/${key}`));
        return;
    }

    // 3. 해당 층에 내가 이미 선택한 게 있는지 확인 (다중 선택 방지)
    const alreadySelectedInFloor = Object.keys(selections).find(k => k.startsWith(`${floor}-`) && selections[k] === myName);
    if (alreadySelectedInFloor) {
        alert("한 층에 하나만 선택할 수 있습니다.");
        return;
    }

    // 4. 선택 등록
    set(ref(db, `rooms/${currentRoom}/selections/${key}`), myName);
}

// 5. 초기화 버튼
document.getElementById('btn-reset').onclick = () => {
    if (confirm("모든 발판을 초기화하시겠습니까?")) {
        remove(ref(db, `rooms/${currentRoom}/selections`));
    }
};
