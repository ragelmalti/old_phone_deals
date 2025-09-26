import React, { useState } from 'react';

export default function UsersTab() {
  // hardcoded
  const initialUsers = [
    { _id: '1', firstname: 'John', lastname: 'Doe', email: 'john@example.com' },
    { _id: '2', firstname: 'Jane', lastname: 'Smith', email: 'jane@acme.com' },
    { _id: '3', firstname: 'Carlos', lastname: 'Lopez', email: 'carlos@foo.com' }
  ];

  const [users, setUsers] = useState(initialUsers);

  const disableUser = (id) => {
    setUsers(users.filter(u => u._id !== id));
  };

  return (
    <>
      <h2>Users</h2>
      <table border="1" cellPadding="5">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u._id}>
              <td>{u.firstname} {u.lastname}</td>
              <td>{u.email}</td>
              <td>
                <button onClick={() => disableUser(u._id)}>Disable</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
