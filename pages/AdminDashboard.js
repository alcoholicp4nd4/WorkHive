import React, { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../database/firebaseConfig';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const snapshot = await getDocs(collection(db, 'users'));
    const userList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setUsers(userList);
  };

  const updateUserRole = async (userId, newRole, newProviderStatus) => {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      role: newRole,
      isProvider: newProviderStatus,
    });
    fetchUsers();
  };

  const deleteUser = async (userId) => {
    const userRef = doc(db, 'users', userId);
    await deleteDoc(userRef);
    fetchUsers();
  };

  const filteredUsers = users.filter(user =>
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const providerCount = users.filter(u => u.isProvider).length;
  const userCount = users.length;

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Admin Dashboard</h2>
        <div style={{ textAlign: 'right' }}>
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: 8, borderRadius: 5, marginRight: 10 }}
          />
          <div><strong>Users:</strong> {userCount}</div>
          <div><strong>Providers:</strong> {providerCount}</div>
        </div>
      </div>

      <div style={{ overflowY: 'auto', maxHeight: '70vh', marginTop: 20 }}>
        {filteredUsers.map(user => (
          <div
            key={user.id}
            style={{ background: '#f1f5f9', padding: 15, marginBottom: 10, borderRadius: 8 }}
          >
            <strong>{user.username}</strong>
            <p>{user.email}</p>
            <p>Role: {user.role || 'user'}</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={() => updateUserRole(user.id, 'admin', user.isProvider)} style={buttonStyle('#0ea5e9')}>Make Admin</button>
              <button onClick={() => updateUserRole(user.id, user.role || 'user', true)} style={buttonStyle('#10b981')}>Make Provider</button>
              <button onClick={() => updateUserRole(user.id, user.role || 'user', false)} style={buttonStyle('#f59e0b')}>Revoke Provider</button>
              <button onClick={() => deleteUser(user.id)} style={buttonStyle('#ef4444')}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const buttonStyle = (bg) => ({
  background: bg,
  color: '#fff',
  border: 'none',
  padding: '8px 12px',
  borderRadius: 5,
  cursor: 'pointer'
});
