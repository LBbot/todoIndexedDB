// creates an instance of db object to store the data in
let db;


window.onload = function () {
    "use strict";
    // prefixes of implementations you want to test
    const windowDOTindexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    // May need references to some window.IDB* objects:
    window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
    window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;

    // opens database
    const DBOpenRequest = windowDOTindexedDB.open("toDoList", 4);

    DBOpenRequest.onsuccess = function () {
        // result of opening the database in the db variable. This is used a lot below
        db = DBOpenRequest.result;

        // populates the list on pageload
        displayData();
    };

    // MOZILLA: This event handles the event whereby a new version of the database needs to be created
    // Either one has not been created before, or a new version number has been submitted via the
    // window.indexedDB.open line above. It is only implemented in recent browsers
    DBOpenRequest.onupgradeneeded = function (event) {
        db = event.target.result;

        // Creates an objectStore for this database
        const objectStore = db.createObjectStore("toDoList", { keyPath: "numberInIndex", autoIncrement: true });

        // defines data items the objectStore will contain
        objectStore.createIndex("note", "note", { unique: false });
        objectStore.createIndex("ticked", "ticked", { unique: false });
    };


    function displayData() {
        // removes each ".js-box" from the DOM, ready for re-populating list
        const listOfBoxes = document.querySelectorAll(".js-box");
        listOfBoxes.forEach(function (element) {
            element.remove();
        });

        // Opens object store and get a cursor list of the data items in the IDB to go through
        const objectStore = db.transaction("toDoList").objectStore("toDoList");

        // Unhides the Empty List message/box
        if (document.querySelector(".box--hidden") !== null) {
            const hiddenbox = document.querySelector(".box--hidden");
            hiddenbox.classList.remove("box--hidden");
        }

        objectStore.openCursor().onsuccess = function (event) {
            const cursor = event.target.result;
            if (cursor) {

                // hides the Empty List message/box if items in IDB
                if (document.querySelector(".box") !== null) {
                    const hiddenbox = document.querySelector(".box");
                    hiddenbox.classList.add("box--hidden");
                }

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

                // Check if box is ticked
                if (cursor.value.ticked === true) {
                    box.classList.add("box--ticked");
                    const buttonsToTick = box.childNodes[2];
                    buttonsToTick.classList.add("buttons--ticked");
                }

                // Adds the finished box to the UL
                const list = document.querySelector(".js-ul");
                list.appendChild(listElement);
                list.appendChild(listTemplate);

                // continue on to the next item in the cursor until done
                cursor.continue();

                // when there are no more cursor items to iterate through, exit the function
            }
        };
    }


    function addItem(e) {
        // Stops page refreshing on submit
        e.preventDefault();

        const inputItem = document.querySelector(".myInput").value;
        const inputTrimmed = inputItem.trim(); // Removes whitespace

        // Checks if input is empty (after trimming whitespace)
        if (inputTrimmed !== "") {
            // Stores the input field in an object (with ticked set default) ready for being inserted into the IDB
            const newItem = [
                { note: inputTrimmed, ticked: false }
            ];

            // Opens a read/write db transaction, ready for adding the data
            const transaction = db.transaction(["toDoList"], "readwrite");

            // When complete, populate the list
            transaction.oncomplete = function () {
                displayData();
            };

            // Calls an object store that's already been added to the database
            const objectStore = transaction.objectStore("toDoList");

            // Makes a request to add newItem object to the object store
            const objectStoreRequest = objectStore.add(newItem[0]);
            objectStoreRequest.onsuccess = function () {
            };
        } else {
            // Blank input error message
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
        // Ensuring this is an int stops some rare bugs
        const number = parseInt(moveIcon.getAttribute("data-number"), 10);
        // Set empty variable to define in If statements
        let targetPosition;

        // Selects the boxes above and below
        const previousBox = moveIcon.parentNode.parentNode.previousElementSibling;
        const nextBox = moveIcon.parentNode.parentNode.nextElementSibling;

        // Check direction and make sure there is a box above or below
        if (direction === "up" && previousBox !== null) {
            targetPosition = parseInt(previousBox.getAttribute("data-number"), 10);
        } else if (direction === "down" && nextBox !== null) {
            targetPosition = parseInt(nextBox.getAttribute("data-number"), 10);
        }

        // Makes sure no mis-clicks go through as invalid values
        if (targetPosition !== undefined && isNaN(targetPosition) === false) {
            // Opens transaction, gets clicked box value
            const objectStore = db.transaction(["toDoList"], "readwrite").objectStore("toDoList");
            const objectStoreTitleRequest = objectStore.get(number);

            // On success, get the target box value to swap with
            objectStoreTitleRequest.onsuccess = function () {
                const objectStoreTitleRequest2 = objectStore.get(targetPosition);

                // On success of that too, get the result to use
                objectStoreTitleRequest2.onsuccess = function () {
                    const data = objectStoreTitleRequest.result;
                    const data2 = objectStoreTitleRequest2.result;

                    // Ensures nothing unexpected passes through from target box for swap
                    if (data2 !== undefined) {
                        const tempTicked = data2.ticked;
                        const tempNote = data2.note;

                        data2.ticked = data.ticked;
                        data2.note = data.note;

                        data.ticked = tempTicked;
                        data.note = tempNote;

                        // Put the swapped data back in the database and repopulate list
                        objectStore.put(data);
                        objectStore.put(data2);

                        hideError();
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
                hideError();
                displayData();
            };
        }
    }


    async function summonModal(evt) {
        const deleteIcon = evt.target.parentNode;
        const number = deleteIcon.getAttribute("data-number");

        // Ensures no invalid number input
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

            });

            if (result) {
                deleteFunc(number);
            }
            backgroundModal.classList.add("myModal--hidden");
        }
    }


    function deleteFunc(number) {
        // open a database transaction
        const transaction = db.transaction(["toDoList"], "readwrite");
        // Actual deletion, have to parseInt because it seemed to default to string and not work
        transaction.objectStore("toDoList").delete(parseInt(number, 10));
        // Populate list
        hideError();
        displayData();
    }


    function clearAll() {
        // Clears error message if needed.
        hideError();
        // Opens a database transaction
        const transaction = db.transaction(["toDoList"], "readwrite");
        // Actual deletion
        transaction.objectStore("toDoList").clear();
        // Ensures DOM is cleared and empty message appears
        displayData();
    }
    const clearbutton = document.querySelector(".clearBox");
    clearbutton.addEventListener("click", clearAll);


    function hideError() {
        // Hides the error box if it's there.
        if (document.querySelector(".error") !== null) {
            const hiddenbox = document.querySelector(".error");
            hiddenbox.innerHTML = "";
            hiddenbox.classList.add("error--hidden");
        }
    }


};
