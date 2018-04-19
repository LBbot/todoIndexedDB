// create an instance of a db object for us to store the IDB data in
let db;


window.onload = function () {
    "use strict";
    console.log("App initialised.");
    // In the following line, you should include the prefixes of implementations you want to test.
    const windowDOTindexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    // DON'T use "var indexedDB = ..." if you're not in a function.
    // Moreover, you may need references to some window.IDB* objects:
    window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
    window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;
    // (Mozilla has never prefixed these objects, so we don't need window.mozIDB*)

    // Let us open our database
    const DBOpenRequest = windowDOTindexedDB.open("toDoList", 4);

    // these two event handlers act on the database being opened successfully, or not
    DBOpenRequest.onerror = function () {
        console.log("Error loading database.");
    };

    DBOpenRequest.onsuccess = function () {
        console.log("Database initialised.");

        // store the result of opening the database in the db variable. This is used a lot below
        db = DBOpenRequest.result;

        // Run the displayData() function to populate the task list with all the to-do list data already in the IDB
        displayData();
    };

    // This event handles the event whereby a new version of the database needs to be created
    // Either one has not been created before, or a new version number has been submitted via the
    // window.indexedDB.open line above
    // it is only implemented in recent browsers
    DBOpenRequest.onupgradeneeded = function (event) {
        db = event.target.result;

        db.onerror = function () {
            console.log("Error loading database.");
        };

        // Create an objectStore for this database
        const objectStore = db.createObjectStore("toDoList", { keyPath: "numberInIndex", autoIncrement: true });

        // define what data items the objectStore will contain
        objectStore.createIndex("note", "note", { unique: false });
        objectStore.createIndex("ticked", "ticked", { unique: false });

        console.log("Object store created.");
    };


    function displayData() {
        // CLEAR
        // removes each ".js-box" FROM THE DOM
        const listOfBoxes = document.querySelectorAll(".js-box");
        listOfBoxes.forEach(function (element) {
            element.remove();
        });

        // Open our object store and then get a cursor list of all the different data items in the IDB to iterate
        // through
        const objectStore = db.transaction("toDoList").objectStore("toDoList");
        objectStore.openCursor().onsuccess = function (event) {
            const cursor = event.target.result;
            // if there is still another cursor to go, keep runing this code
            if (cursor) {
                // Selects template, and clones it
                const listTemplate = document.querySelector(".js-list-template");
                const listElement = listTemplate.content.cloneNode(true);

                // Selects empty li, sets input as text node (which sanitises) and appends it in
                const emptyLi = listElement.querySelector(".notez");
                const inputValue = cursor.value.note;
                const textNodeInput = document.createTextNode(inputValue);
                emptyLi.appendChild(textNodeInput);

                // Selects the whole box and gives it the event listener and function for ticking it
                const box = listElement.querySelector(".js-box");
                box.addEventListener("click", tickSwitch);
                box.setAttribute("data-number", cursor.value.numberInIndex);

                // Selects the UP icon, gives it the event listener and function
                const moveUpIcon = listElement.querySelector(".upbutton");
                moveUpIcon.addEventListener("click", moveFunc);
                moveUpIcon.setAttribute("data-number", cursor.value.numberInIndex);

                // Selects the DOWN icon, gives it the event listener and function
                const moveDownIcon = listElement.querySelector(".downbutton");
                moveDownIcon.addEventListener("click", moveFunc);
                moveDownIcon.setAttribute("data-number", cursor.value.numberInIndex);

                // Selects the delete icon, gives it the event listener and delete/modal function
                const deleteIcon = listElement.querySelector(".deletebutton");
                deleteIcon.addEventListener("click", summonModal);
                deleteIcon.setAttribute("data-number", cursor.value.numberInIndex);

                // Check if ticked
                if (cursor.value.ticked === true) {
                    box.classList.add("box--ticked");
                    const buttonsToTick = box.childNodes[2];
                    buttonsToTick.classList.add("buttons--ticked");
                }

                // Adds the finished box to the UL
                const list = document.querySelector(".js-ul");
                list.appendChild(listElement);
                list.appendChild(listTemplate);

                // continue on to the next item in the cursor
                cursor.continue();

                // if there are no more cursor items to iterate through, say so, and exit the function
            } else {
                console.log("Entries all displayed.");
            }
        };
    }


    function addItem(e) {
        // Stops page refreshing on submit:
        e.preventDefault();

        const inputItem = document.querySelector(".myInput").value;
        const inputTrimmed = inputItem.trim(); // Removes whitespace

        // Checks if blank input
        if (inputTrimmed !== "") {
            // grab the values entered into the form fields and store them in an object ready for being inserted into
            // the IDB
            const newItem = [
                { note: inputTrimmed, ticked: false }
            ];

            // open a read/write db transaction, ready for adding the data
            const transaction = db.transaction(["toDoList"], "readwrite");

            // report on the success of the transaction completing, when everything is done
            transaction.oncomplete = function () {
                console.log("Transaction completed: database modification finished.");
                // update the display of data to show the newly added item, by running displayData() again.
                displayData();
            };

            transaction.onerror = function () {
                console.log("Transaction not opened due to error: " + transaction.error);
            };

            // call an object store that's already been added to the database
            const objectStore = transaction.objectStore("toDoList");

            // Make a request to add our newItem object to the object store
            const objectStoreRequest = objectStore.add(newItem[0]);
            objectStoreRequest.onsuccess = function () {
                // report the success of our request
                // (to detect whether it has been succesfully
                // added to the database, you'd look at transaction.oncomplete)
                console.log("Request successful.");

                // clear the form, ready for adding the next entry
                // title.value = '';
            };

        } else {
            const hiddenbox = document.querySelector(".error");
            hiddenbox.innerHTML = "<i class=\"fas fa-exclamation-triangle\"></i> You cannot enter a blank item.";
            if (document.querySelector(".error--hidden") !== null) {
                hiddenbox.classList.remove("error--hidden");
            }
        }
    }
    const submitButton = document.querySelector(".js-submit");
    submitButton.addEventListener("click", addItem);


    function moveFunc(evt) {
        const moveIcon = evt.target.parentNode;
        const direction = moveIcon.classList.contains("upbutton") ? "up" : "down";
        const number = parseInt(moveIcon.getAttribute("data-number"), 10);
        let targetPosition;

        const previousBox = moveIcon.parentNode.parentNode.previousElementSibling;
        const nextBox = moveIcon.parentNode.parentNode.nextElementSibling;

        // Check direction and make sure you can't go up past index 0.
        if (direction === "up" && previousBox !== null) {
            targetPosition = parseInt(previousBox.getAttribute("data-number"), 10);
            console.log(targetPosition);
        // Check direction and make sure you can't go past the bottom of the list
        } else if (direction === "down" && nextBox !== null) {
            targetPosition = parseInt(nextBox.getAttribute("data-number"), 10);
            console.log(targetPosition);
        }

        if (targetPosition !== undefined && isNaN(targetPosition) === false) {
            const objectStore = db.transaction(["toDoList"], "readwrite").objectStore("toDoList");
            const objectStoreTitleRequest = objectStore.get(number);
            objectStoreTitleRequest.onsuccess = function () {
                const objectStoreTitleRequest2 = objectStore.get(targetPosition);

                objectStoreTitleRequest2.onsuccess = function () {

                    const data = objectStoreTitleRequest.result;
                    const data2 = objectStoreTitleRequest2.result;

                    if (data2 !== undefined) {
                        const tempTicked = data2.ticked;
                        const tempNote = data2.note;

                        data2.ticked = data.ticked;
                        data2.note = data.note;

                        data.ticked = tempTicked;
                        data.note = tempNote;

                        // Put the changed data back in the database and repopulate list
                        objectStore.put(data);
                        objectStore.put(data2);

                        // checkHideError();
                        displayData();
                    }
                };
            };
        }
    }


    function tickSwitch(evt) {
        const singleBox = evt.target;

        // Set a boolean to avoid repeating in if/else
        let newBooleanState = true;
        if (singleBox.classList.contains("box--ticked")) {
            newBooleanState = false;
        }

        // This is a workaround to stop this being accidentally triggered by the delete button
        if (singleBox.childNodes[0] !== undefined) {
            const objectStore = db.transaction(["toDoList"], "readwrite").objectStore("toDoList");
            const number = parseInt(singleBox.getAttribute("data-number"), 10);
            const objectStoreTitleRequest = objectStore.get(number);

            objectStoreTitleRequest.onsuccess = function () {
                // Grab the data object returned as the result
                const data = objectStoreTitleRequest.result;

                // Change ticked value to true/false
                data.ticked = newBooleanState;

                // Put the changed data back in the database and repopulate list
                objectStore.put(data);
                displayData();
            };
        }
    }


    async function summonModal(evt) {
        const deleteIcon = evt.target.parentNode;
        const number = deleteIcon.getAttribute("data-number");
        if (!isNaN(number) && number !== null) {
            // Prep the item to show in the modal
            // const quoteForList = document.querySelector(".quote");
            // quoteForList.innerHTML = [number].note;

            // Show modal
            const backgroundModal = document.querySelector(".myModal");
            const modalBox = document.querySelector(".modalContent");
            backgroundModal.classList.remove("myModal--hidden");

            const result = await new Promise((resolve) => {
                const yesButton = document.querySelector(".ok");
                const noButton = document.querySelector(".cancel");

                // Confirmation resolves the promise with true
                yesButton.addEventListener("click", () => {
                    resolve(true);
                }, {once: true});

                // Click on cancel or background to resolve the promise returning false
                function resolveFalseFunction() {
                    resolve(false);
                }
                noButton.addEventListener("click", resolveFalseFunction, {once: true});
                backgroundModal.addEventListener("click", resolveFalseFunction, {once: true});

                // Stops a click on the inner modal box from dismissing it
                modalBox.addEventListener("click", e => {
                    e.stopPropagation();
                });

            }).catch(ignore => {
                // If the promise rejects or throws, catch it, so it doesn't error
                console.log("Error in promise catch " + ignore);
            });

            if (result) {
                deleteFunc(number);
            }
            backgroundModal.classList.add("myModal--hidden");
        }
    }


    function deleteFunc(number) {
        // open a database transaction and delete the task, finding it by the name we retrieved above
        const transaction = db.transaction(["toDoList"], "readwrite");
        console.log(number);
        // Actual deletion, have to parseInt because it seemed to default to string and not work
        transaction.objectStore("toDoList").delete(parseInt(number, 10));
        displayData();
    }


    function clearAll() {
        // Clears error message if needed.
        // checkHideError();

        const transaction = db.transaction(["toDoList"], "readwrite");
        // Actual deletion
        transaction.objectStore("toDoList").clear();

        // Ensures DOM is cleared and empty message appears
        displayData();
    }
    const clearbutton = document.querySelector(".clearBox");
    clearbutton.addEventListener("click", clearAll);

};
