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
    const transaction = db.transaction(['new_transaction'], 'readwrite');

    // access your object store
    const transactionObjectStore = transaction.objectStore('new_transaction');

    // get all records from store and set to a variable
    const getAll = transactionObjectStore.getAll();

    getAll.onsuccess = function() {
        // if the index store isn't empty, it will get everything in there and
        // send to post route
        if (getAll.result.length > 0) {
          fetch('/api/transaction', {
            method: 'POST',
            body: JSON.stringify(getAll.result),
            headers: {
              Accept: 'application/json, text/plain, */*',
              'Content-Type': 'application/json'
            }
          })
            .then(response => response.json())
            .then(serverResponse => {
              if (serverResponse.message) {
                throw new Error(serverResponse);
              }
              // start another transaction with indexedDB
              const transaction = db.transaction(['new_transaction'], 'readwrite');
              // access the new_transaction object store
              const transactionObjectStore = transaction.objectStore('new_transaction');
              // clears everything from the store
              transactionObjectStore.clear();

              alert('All saved transactions have been submitted.');
              // deletes cache so that service worker will need to recache everything,
              // reflecting the changes from the transactions that were just posted.
              caches.delete('BudgetTracker-1');
              // reloads page to reflect changes and create new cache
              location.reload();
            })
            .catch(err => {
              console.log(err);
            });
        }
      };
  }

  window.addEventListener('online', uploadTransaction);
