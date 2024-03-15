let skip = 0;

window.onload = genrateDataDb();

function genrateDataDb() {
  axios
    .get(`/pagination_dashboard?skip=${skip}`)
    .then((res) => {
      if (res.data.status !== 200) {
        alert(res.data.message);
        return;
      }
      const dataDb = res.data.data;
      
      document.getElementById("item_list").innerHTML=`<li class="list-group-item list-group-item-action d-flex align-items-center justify-content-between">
      
      <span class="item-text">rollno.</span>
      <span class="item-text">Student Name</span>
      <span class="item-text">Student Email</span>
      <span class="item-text">Operations</span>

      </li>`
      document.getElementById("item_list").insertAdjacentHTML(
        "beforeend",
        dataDb
          .map((item) => {
            return `<li class="list-group-item list-group-item-action d-flex align-items-center justify-content-between">
        <span class="item-text"> ${item.rollno}</span>
        <span class="item-text"> ${item.studentName}</span>
        <span class="item-text"> ${item.studentEmail}</span>
        <div>
        <button data-id="${item._id}" class="edit-me btn btn-secondary btn-sm mr-1">Edit</button>
        <button data-id="${item._id}" class="delete-me btn btn-danger btn-sm">Delete</button>
        </div></li>`;
          })
          .join("")
      );

      skip += dataDb.length;

      return;
    })
    .catch((err) => {
      alert(err.message);
      return;
    });
}

document.addEventListener("click", function (event) {
  //edit
  if (event.target.classList.contains("edit-me")) {
    const rollno = prompt("Enter new rollno.");
    const studentName = prompt("Enter new student name.");
    const studentEmail = prompt("Enter new email.");

    const id = event.target.getAttribute("data-id");

    axios
      .post("/edit-student", { id, rollno,studentName,studentEmail })
      .then((res) => {
        if (res.data.status !== 200) {
          alert(res.data.message);
          return;
        }

        event.target.parentElement.parentElement.querySelector(
          ".item-text"
        ).innerHTML = {rollno,studentName,studentEmail};
      })
      .catch((err) => {
        console.log(err);
      });
  }
  //delete
  else if (event.target.classList.contains("delete-me")) {
    const id = event.target.getAttribute("data-id");

    axios
      .post("/delete-student", { id })
      .then((res) => {
        if (res.data.status !== 200) {
          alert(res.data.message);
          return;
        }
        event.target.parentElement.parentElement.remove();
        return;
      })
      .catch((err) => {
        console.log(err);
      });
  }
  //add
  else if (event.target.classList.contains("add_item")) {
    const {rollno,studentName,studentEmail} = document.getElementById("create_field").value;

    axios
      .post("/create-student", { rollno,studentName,studentEmail })
      .then((res) => {
        if (res.data.status !== 201) {
          alert(res.data.message);
        }
        document.getElementById("create_field").value = "";

        document.getElementById("item_list").insertAdjacentHTML(
          "beforeend",
          `<li class="list-group-item list-group-item-action d-flex align-items-center justify-content-between">
                <span class="item-text"> ${res.data.data.rollno}</span>
                <span class="item-text"> ${res.data.data.studentName}</span>
                <span class="item-text"> ${res.data.data.studentEmail}</span>
                <div>
                <button data-id="${res.data.data._id}" class="edit-me btn btn-secondary btn-sm mr-1">Edit</button>
                <button data-id="${res.data.data._id}" class="delete-me btn btn-danger btn-sm">Delete</button>
                </div></li>`
        );
      })
      .catch((err) => {
        console.log(err);
      });
  }

  else if(event.target.classList.contains('show_more')){
    genrateDataDb()
  }
 
});
