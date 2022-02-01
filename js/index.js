class Model {
  constructor() {
    this.baseURL = 'https://jsonplaceholder.typicode.com';
    this.users = null;
  }

  async getUsers() {
    console.log(this.users ? 'getting users: taking from cache' : 'getting users: fetching');
    return this.users ? 
           this.users : 
            fetch(this.baseURL + '/users')
              .then(response => response.json())
              .then(arr => {
                this.users = arr;
                return arr;
              });
  }

  async updateUser(id, data) {
    console.log(`updating user ${id}`);
    return fetch(`${this.baseURL}/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      headers: {
        'Content-type': 'application/json; charset=UTF-8'
      }
    })
      .then(response => response.ok);
  }

  async deleteUser(id) {
    return fetch(`${this.baseURL}/users/${id}`, {
      method: 'DELETE'
    })
      .then(response => {
        if(response.ok) {
          this.users = this.users.filter(el => el.id !== id);
        }
        return response.ok;
      });
  }
}

class Control {
  constructor(parentNode, tagName = 'div', className = '', content = '') {
    const el = document.createElement(tagName);
    el.className = className;
    el.textContent = content;
    if (parentNode) {
      parentNode.append(el);
    }
    this.node = el;
  }

  destroy() {
    this.node.remove();
  }
}

class User extends Control {
  constructor(parentNode, data) {
    super(parentNode, 'li', 'user');
    this.data = data;
    this.render();
  }

  render() {
    this.node.innerHTML = `<span>[ID:${this.data.id}] ${this.data.username} (${this.data.name})</span>
                          <span class="">Email: <a href="mailto:${this.data.email}">${this.data.email}</a></span>
                          <span class="">Phone: ${this.data.phone}</span>`;


    const buttonsWrapper = new Control(this.node, 'div', '');

    const editBtn = new Control(buttonsWrapper.node, 'button', 'btn', 'Edit user');
    editBtn.node.onclick = () => {
      this.onEdit();
    };

    const deleteBtn = new Control(buttonsWrapper.node, 'button', 'btn', 'Delete user');
    deleteBtn.node.onclick = async () => {
      await this.onDelete() && this.destroy();
    };
  }

}

class EditUser extends Control {
  constructor(parentNode, data) {
    super(parentNode, 'form', 'edit-form', `Modifying user id: ${data.id}`);
    this.data = data;
    this.render(this.node, this.data);

    const backBtn = new Control(this.node, 'button', 'btn', 'Back to users list');
    backBtn.node.onclick = async (e) => {
      e.preventDefault();
      const modifiedUserData = this.modifiedStatus ? data : null;
      this.onReturn(modifiedUserData);
    };
  }

  render(node, data) {
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        if(typeof data[key] === 'object') {
          const group = new Control(node, 'fieldset', 'fieldset');
          group.node.innerHTML = `<legend>${key.toUpperCase()}</legend>`;
          this.render(group.node, data[key]);
          continue;
        }

        const label = new Control(node, 'label', 'edit-label', key + ': ');
        const input = new Control(label.node, 'input', 'edit-input');
        input.node.value = data[key];
        input.node.onchange = () => {
          this.modifiedStatus = true;
          data[key] = input.node.value;
        }
      }
    }
  }
}

class Spinner extends Control {
  constructor(parentNode, text) {
    super(parentNode, 'div', 'lds-ring-container', text);
    this.node.innerHTML += `<div class="lds-ring"><div></div><div></div><div></div><div></div></div>`;
  }
}

class View {
  constructor(parentNode, model) {
    this.parentNode = parentNode; //todo rename parentNode to rootNode ?
    this.model = model;
    this.renderUsersList();
  }

  renderUsersList() {
    this.parentNode.innerHTML = '';
    this.spinner = new Spinner(this.parentNode, 'Loading users');
    return this.model.getUsers()
            .then(usersArr => {
              this.usersList = new Control(this.parentNode, 'ul', 'users-list');
              return usersArr;
            })
            .then(usersArr => usersArr.map(user => {
              const currentUser = new User(this.usersList.node, user);

              currentUser.onDelete = () => {
                return new Promise((res) => {
                  this.spinner = new Spinner(this.parentNode, 'Deleting user');
                  res(user);
                })
                  .then((user) => this.model.deleteUser(user.id))
                  .then((status) => {
                    this.spinner.destroy();
                    return status;
                  });
              };

              currentUser.onEdit = () => {
                this.parentNode.innerHTML = '';
                const editUser = new EditUser(this.parentNode, user);

                editUser.onReturn = (user) => {
                  if(!user) {
                    this.renderUsersList();
                    return;
                  }

                  return new Promise((res) => {
                    this.spinner = new Spinner(this.parentNode, 'Updating changes...');
                    res(user);
                  })
                    .then((user) => this.model.updateUser(user.id, user))
                    .finally((status) => {
                      this.renderUsersList();
                      return status;
                    });
                };
              };

              return currentUser;
            }))
            .then(() => this.spinner.destroy());
  }
}

const app = new View(document.body, new Model());
