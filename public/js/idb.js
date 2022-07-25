//function to clear cache so that changes to database will be reflected on page refresh
function clearCache() {
  const APP_PREFIX = "BudgetTracker-";
  const VERSION = "1";
  const CACHE_NAME = APP_PREFIX + VERSION;
  const FILES_TO_CACHE = [
    "./index.html",
    "./css/styles.css",
    "./js/index.js",
    "./icons/icon-72x72.png",
    "./icons/icon-96x96.png",
    "./icons/icon-128x128.png",
    "./icons/icon-144x144.png",
    "./icons/icon-152x152.png",
    "./icons/icon-192x192.png",
    "./icons/icon-384x384.png",
    "./icons/icon-512x512.png",
    "/",
    "./manifest.json",
    "./api/transaction",
    "./js/idb.js",
  ];
  if(navigator.onLine) {
  caches.delete(CACHE_NAME);
  caches
    .open(CACHE_NAME)
    .then(function (cache) {
      return cache.addAll(FILES_TO_CACHE);
    })
    .catch(() => console.log("Error: Could not create new cache"));
  }
  return;
};

let db;

//variable to interact with the budget_tracker collection in indexedDB
const request = indexedDB.open("budget_tracker", 1);

request.onupgradeneeded = function (event) {
  const db = event.target.result;
  //creates object store for new transactions, key value pair that will auto increment
  db.createObjectStore("new_transaction", { autoIncrement: true });
};

// Will run uploadTransaction() if app is online.
request.onsuccess = function (event) {
  db = event.target.result;

  if (navigator.onLine) {
    uploadTransaction();
  }
};

request.onerror = function (event) {
  console.log(event.target.errorCode);
};

// addes new records to indexedDB if they were unable to be posted
function saveRecord(record) {
  //opens new transaction with indexedDB to read/write
  const transaction = db.transaction(["new_transaction"], "readwrite");

  // accesses the object store for "new_transaction"
  const transactionObjectStore = transaction.objectStore("new_transaction");

  // adds record to store so that it can be uploaded later.
  transactionObjectStore.add(record);
}

//uploads new entries stored in indexedDB
function uploadTransaction() {
  // open a transaction on your db
  const transaction = db.transaction(["new_transaction"], "readwrite");

  // access your object store
  const transactionObjectStore = transaction.objectStore("new_transaction");

  // get all records from store and set to a variable
  const getAll = transactionObjectStore.getAll();

  getAll.onsuccess = function () {
    // if the index store isn't empty, it will get everything in there and
    // send to post route
    if (getAll.result.length > 0) {
      fetch("/api/transaction", {
        method: "POST",
        body: JSON.stringify(getAll.result),
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
        },
      })
        .then((response) => response.json())
        .then((serverResponse) => {
          if (serverResponse.message) {
            throw new Error(serverResponse);
          }
          // start another transaction with indexedDB
          const transaction = db.transaction(["new_transaction"], "readwrite");
          // access the new_transaction object store
          const transactionObjectStore =
            transaction.objectStore("new_transaction");
          // clears everything from the store
          transactionObjectStore.clear();

          alert("All saved transactions have been submitted.");
          // deletes cache so that service worker will need to recache everything,
          // reflecting the changes from the transactions that were just posted.
          clearCache();
          // reloads page to reflect changes and create new cache
          location.reload();
        })
        .catch((err) => {
          console.log(err);
        });
    }
  };
}

window.addEventListener("online", uploadTransaction);
//listens for page refresh so new cache can be created with changes
window.addEventListener("load", clearCache);
