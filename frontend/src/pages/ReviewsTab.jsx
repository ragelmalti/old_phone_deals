// src/components/ReviewsTab.jsx
import React from 'react';

export default function ReviewsTab() {
  // Hard-coded sample reviews
  const reviews = [
    {
      _id: 'r1',
      phone: { title: 'iPhone 15 Pro' },
      reviewer: { firstname: 'Alice', lastname: 'Smith' },
      rating: 5,
      comment: 'Fantastic phone—love the camera!',
      hidden: false
    },
    {
      _id: 'r2',
      phone: { title: 'Galaxy S24 Ultra' },
      reviewer: { firstname: 'Bob', lastname: 'Jones' },
      rating: 4,
      comment: 'Great performance but battery life could be better.',
      hidden: true
    },
    {
      _id: 'r3',
      phone: { title: 'Pixel 8 Pro' },
      reviewer: { firstname: 'Carol', lastname: 'Lee' },
      rating: 3,
      comment: 'Decent phone, but I prefer stock Android on my Pixel 7.',
      hidden: false
    }
  ];

  function toggleReview(id) {
    alert(`(Hardcoded) Toggle hidden for review ${id}`);
  }

  return (
    <>
      <h2>Comments (Hardcoded)</h2>
      <table border="1" cellPadding="5">
        <thead>
          <tr>
            <th>Phone</th>
            <th>Reviewer</th>
            <th>Rating</th>
            <th>Hidden</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {reviews.map(r => (
            <tr key={r._id}>
              <td>{r.phone.title}</td>
              <td>{r.reviewer.firstname} {r.reviewer.lastname}</td>
              <td>{r.rating}</td>
              <td>{r.hidden ? 'Yes' : 'No'}</td>
              <td>
                <button onClick={() => toggleReview(r._id)}>
                  {r.hidden ? 'Unhide' : 'Hide'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
