// src/pages/AdminDashboard.jsx
import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useAuth } from "../provider/authProvider";
import { useNavigate } from "react-router-dom";
import toast from "react-simple-toasts";
import Modal from "react-modal";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender
} from "@tanstack/react-table";
import "./AdminDashboard.css";

Modal.setAppElement('#root');

// Only allow editing of title, price, and stock for listings
const editableFields = {
  users:    ['firstname','lastname','email','disabled'],
  listings: ['title','price','stock']
};

export default function AdminDashboard() {
  const { token, setToken } = useAuth();
  const navigate = useNavigate();
  const headers = { Authorization: `Bearer ${token}` };

  // Inactivity timeout  for admin session
  useEffect(() => {
    if (!token) return;
    const TIMEOUT = 30 * 60 * 1000;
    let timerId;
    const resetTimer = () => {
      if (timerId) clearTimeout(timerId);
      timerId = setTimeout(() => {
        setToken(null);
        toast("Session expired due to inactivity");
        navigate("/login", { replace: true });
      }, TIMEOUT);
    };
    ['mousemove','keydown','click'].forEach(evt => window.addEventListener(evt, resetTimer));
    resetTimer();
    return () => {
      clearTimeout(timerId);
      ['mousemove','keydown','click'].forEach(evt => window.removeEventListener(evt, resetTimer));
    };
  }, [token, setToken, navigate]);

  // UI state
  const [tab, setTab] = useState("users");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalItem, setModalItem] = useState(null);
  const [userReviews, setUserReviews] = useState([]);
  const [reviewModalUser, setReviewModalUser] = useState(null);
  const [reviews, setReviews]                   = useState([]);
 const [listingReviews, setListingReviews]     = useState([]);
 const [listingReviewModal, setListingReviewModal] = useState(null);
 const [userListings, setUserListings]                 = useState([]);
  const [userListingsModalUser, setUserListingsModalUser] = useState(null);

  // Data
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Centralized fetch for current tab data
  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = { search };
      let res;
      switch (tab) {
        case "users":
          res = await axios.get("/api/admin/users", { params, headers });
          setUsers(res.data);
          break;
        case "listings":
          res = await axios.get("/api/admin/listings", { params, headers });
          setListings(res.data);
          break;
        case "transactions":
          res = await axios.get("/api/admin/transactions", { headers });
          setTransactions(res.data);
          break;
        case "notifications":
          res = await axios.get("/api/admin/notifications", { headers });
          setNotifications(res.data);
          break;
        case "reviews":
        // our new reviews‐tab
        res = await axios.get("/api/admin/reviews", {
          params: { search, showHidden: true },
          headers
        });
        setReviews(res.data);
        break;
      default:
        return;
      }
    } catch (err) {
      if (err.response?.status === 401) {
        // Token expired or unauthorized: log out
        setToken(null);
        toast('Session expired. Please log in again.');
        navigate('/login', { replace: true });
        return;
      }
      toast(`Failed to load ${tab}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch when tab, search, or token change
  useEffect(() => {
    fetchData();
  }, [tab, search, token]);

  // Column definitions
  const columns = useMemo(() => {
    switch (tab) {
      case "users":
        return [
          { accessorKey: 'firstname', header: 'First Name' },
          { accessorKey: 'lastname',  header: 'Last Name'  },
          { accessorKey: 'email',     header: 'Email'      },
          //{ accessorKey: 'registrationDate', header: 'Registered', cell: info => new Date(info.getValue()).toLocaleString() },
          { 
            accessorKey: 'lastLogin', 
            header: 'Last Login',
            cell: info => {
              const val = info.getValue();
              const date = new Date(val);
              return val && !isNaN(date.getTime())
                ? date.toLocaleString()
                : '';
            }
            },
          { accessorKey: 'disabled',  header: 'Disabled'   },
          { header: 'Actions', cell: ({ row }) => (
              <>
                <button onClick={() => openEditModal(row.original)}>Edit</button>
                <button onClick={() => openUserListings(row.original)} className="ml-2">Listings</button>
                <button onClick={() => openUserReviews(row.original)} className="ml-2">Reviews</button>
                <button onClick={() => toggleDisable('users', row.original)} className="ml-2">
                  {row.original.disabled ? 'Enable' : 'Disable'}
                </button>
                <button onClick={() => deleteItem('users', row.original._id)} className="ml-2">Delete</button>
              </>
            )
          }
        ];
      case "listings":
        return [
          { accessorKey: 'image', header: 'Image', cell: info => (
              <img src={info.getValue()} alt={info.row.original.title} className="listing-image" />
            )
          },
          { accessorKey: 'title',    header: 'Title'  },
          { header: 'Seller', cell: info => 
              `${info.row.original.sellerFirstname} ${info.row.original.sellerLastname}`
         },
          { accessorKey: 'brand',    header: 'Brand'  },
          { accessorKey: 'price',    header: 'Price'  },
          { accessorKey: 'stock',    header: 'Stock'  },
          { accessorKey: 'disabled', header: 'Hidden' },
          { header: 'Actions', cell: ({ row }) => (
              <>
                <button onClick={() => openEditModal(row.original)}>Edit</button>
                <button onClick={() => toggleDisable('listings', row.original)} className="ml-2">
                  {row.original.disabled ? 'Unhide' : 'Hide'}
                </button>
                {/* show reviews for this listing */}
              <button onClick={() => openListingReviews(row.original)} className="ml-2">
                Reviews
              </button>
              <button
                onClick={() => deleteItem('listings', row.original._id)}
                className="ml-2 text-red-600"
              >
                Delete
              </button>
              </>
            )
          }
        ];
      case "reviews":
        return [
          { accessorKey: 'listingTitle', header: 'Listing'  },
          { accessorKey: 'reviewerName',  header: 'Reviewer' },
          { accessorKey: 'rating',        header: 'Rating'   },
          { accessorKey: 'comment',       header: 'Comment'  },
          { accessorKey: 'hidden',        header: 'Hidden', cell: i => i.getValue() ? 'Yes' : 'No' },
          { header: 'Actions', cell: ({ row }) => (
            <button
              onClick={() =>
                toggleReviewVisibility(
                  row.original.listingId,
                  row.original.reviewIndex,
                  row.original.hidden
                )
              }
            >
              {row.original.hidden ? 'Unhide' : 'Hide'}
            </button>
          )}
        ];
      case "transactions":
        return [
          { accessorKey: 'timestamp', header: 'Timestamp', cell: info => new Date(info.getValue()).toLocaleString() },
          { accessorKey: 'buyerName', header: 'Buyer' },
          { accessorKey: 'cart',      header: 'Items', cell: info => info.getValue().map(i => `${i.name}(${i.quantity})`).join(', ') },
          { accessorKey: 'total',
            header: 'Total',
            cell: info => Number(info.getValue()).toFixed(2)
          }
        ];
      case "notifications":
        return [
          { accessorKey: 'type',          header: 'Type' },
          { accessorKey: 'timestamp',     header: 'Time', cell: info => new Date(info.getValue()).toLocaleString() },
          { accessorKey: 'transactionId', header: 'Transaction ID' }
        ];
      default:
        return [];
    }
  }, [tab]);

  const data = useMemo(() => {
    switch (tab) {
      case "users":         return users;
      case "listings":      return listings;
      case "transactions":  return transactions;
      case "notifications": return notifications;
      case "reviews":       return reviews;
      default:               return [];
    }
  }, [tab, users, listings, transactions, notifications, reviews]);

  // new handlers for listing reviews & toggling review visibility
   const openListingReviews = async listing => {
     setLoading(true);
     try {
       const res = await axios.get("/api/admin/reviews", { params: { showHidden: true }, headers });
       setListingReviews(res.data.filter(r => r.listingId === listing._id));
       setListingReviewModal(listing);
     } catch {
       toast("Failed to load reviews");
     } finally {
       setLoading(false);
     }
   };
   const closeListingReviewModal = () => setListingReviewModal(null);

   const toggleReviewVisibility = async (listingId, reviewIndex, hidden) => {
     await axios.put(
       `/api/admin/reviews/${listingId}/${reviewIndex}/visibility`,
       { hidden: !hidden },
       { headers }
     );
     toast("Toggled successfully");
     fetchData();
   };

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel:       getCoreRowModel(),
    getSortedRowModel:     getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  });

  // Handlers
  const openEditModal = item => setModalItem({ ...item, _tab: tab });
  const closeModal = () => setModalItem(null);

  const openUserReviews = async user => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/admin/users/${user._id}/reviews`, { headers });
      setUserReviews(res.data);
      setReviewModalUser(user);
    } catch {
      toast("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  };

  const closeReviewsModal = () => setReviewModalUser(null);

  const openUserListings = async user => {
    setLoading(true);
    try {
      const res = await axios.get("/api/admin/listings", {
        params: { seller: user._id },
        headers
      });
      setUserListings(res.data);
      setUserListingsModalUser(user);
    } catch {
      toast("Failed to load user's listings");
    } finally {
      setLoading(false);
    }
  };
  const closeUserListingsModal = () => setUserListingsModalUser(null);

  const saveEdit = async () => {
    try {
      const { _tab, _id, ...body } = modalItem;
      await axios.put(`/api/admin/${_tab}/${_id}`, body, { headers });
      toast("Updated successfully");
      fetchData();
    } catch {
      toast("Update failed");
    }
    closeModal();
  };

  const toggleDisable = async (route, item) => {
   await axios.put(
     `/api/admin/${route}/${item._id}/disable`,
     { disabled: !item.disabled },
     { headers }
   );
   toast("Toggled successfully");
   fetchData();
 };

  const deleteItem = async (route, id) => {
    if (!confirm("Confirm delete?")) return;
    try {
      await axios.delete(`/api/admin/${route}/${id}`, { headers });
      toast("Deleted");
      fetchData();
    } catch {
      toast("Delete failed");
    }
  };

    const exportCSV = async () => {
    try {
      const response = await axios.get(
        "/api/admin/transactions/export?format=csv",
        { headers, responseType: 'blob' }
      );
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sales.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('CSV export failed', err);
      toast('Export failed');
    }
  };

  return (
    <div className="p-4">
      {/* Tabs */}
      <nav className="flex space-x-2 mb-4">
        {['users','listings','transactions','notifications', 'reviews'].map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setSearch(''); }}
            className={`px-3 py-1 rounded ${tab===t? 'bg-blue-500 text-white':'bg-gray-200'}`}
          >{t.toUpperCase()}</button>
        ))}
      </nav>

      {/* Controls */}
      <div className="flex items-center mb-4">
        {/* only show search on users, listings, and the new reviews tab */}
        {['users','listings','reviews'].includes(tab) && (
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            className="border px-2 py-1 mr-4"
          />
        )}

        {tab==='transactions' && (
          <button onClick={exportCSV} className="ml-auto px-3 py-1 bg-green-500 text-white rounded">Export CSV</button>
        )}
      </div>

      {/* Table or Loader */}
      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="overflow-auto">
          <table className="min-w-full border">
            <thead>
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id}>
                  {hg.headers.map(header => (
                    <th key={header.id} className="border px-2 py-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map(row => (
                <tr key={row.id} className="hover:bg-gray-100">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="border px-2 py-1">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {/* Pagination */}
          <div className="flex items-center space-x-2 mt-2">
            <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Prev</button>
            <span>Page {table.getState().pagination.pageIndex+1} of {table.getPageCount()}</span>
            <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={!!modalItem}
        onRequestClose={closeModal}
        contentLabel="Edit Item"
        ariaHideApp={false}
        className="p-4 bg-white max-w-lg mx-auto mt-20"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
      >
        {modalItem && (
          <>
            <h2>Edit {modalItem._tab}</h2>
            {editableFields[modalItem._tab].map(key => (
              <div key={key} className="mb-2">
                <label className="block text-sm">{key}</label>
                <input
                  type={['price','stock'].includes(key)? 'number' : (key==='disabled'? 'checkbox':'text')}
                  className="w-full border px-2 py-1"
                  {...(
                    key==='disabled'
                      ? { checked: modalItem.disabled }
                      : { value: modalItem[key] }
                  )}
                  onChange={e => {
                    const value = key==='disabled'
                      ? e.target.checked
                      : (['price','stock'].includes(key)
                          ? Number(e.target.value)
                          : e.target.value
                        );
                    setModalItem(mi => ({ ...mi, [key]: value }));
                  }}
                />
              </div>
            ))}
            <div className="flex justify-end space-x-2">
              <button onClick={saveEdit} className="px-3 py-1 bg-blue-500 text-white">Save</button>
              <button onClick={closeModal} className="px-3 py-1 bg-gray-300">Cancel</button>
            </div>
          </>
        )}
      </Modal>

      {/* User Reviews Modal */}
      <Modal
        isOpen={!!reviewModalUser}
        onRequestClose={closeReviewsModal}
        contentLabel="User Reviews"
        ariaHideApp={false}
        className="p-4 bg-white max-w-lg mx-auto mt-20"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
      >
        {reviewModalUser && (
          <>
            <h2>Reviews by {reviewModalUser.firstname} {reviewModalUser.lastname}</h2>
            {userReviews.length === 0 ? (
              <p>No reviews found.</p>
            ) : (
              <div className="overflow-auto max-h-64">
                <table className="min-w-full border">
                  <thead>
                    <tr>
                      <th className="border px-2 py-1">Listing</th>
                      <th className="border px-2 py-1">Rating</th>
                      <th className="border px-2 py-1">Comment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userReviews.map((r,i) => (
                      <tr key={i} className="hover:bg-gray-100">
                        <td className="border px-2 py-1">{r.listingTitle}</td>
                        <td className="border px-2 py-1">{r.rating}</td>
                        <td className="border px-2 py-1">{r.comment}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-end mt-4">
              <button onClick={closeReviewsModal} className="px-3 py-1 bg-gray-300">Close</button>
            </div>
          </>
        )}
      </Modal>

      {/* Listing-specific Reviews Modal */}
      <Modal
        isOpen={!!listingReviewModal}
        onRequestClose={closeListingReviewModal}
        contentLabel="Listing Reviews"
        className="p-4 bg-white max-w-lg mx-auto mt-20"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
      >
        {listingReviewModal && (
          <>
            <h2>Reviews for "{listingReviewModal.title}"</h2>
           {listingReviews.length === 0 ? (
             <p>No reviews found.</p>
           ) : (
              <div className="overflow-auto max-h-64">
                <table className="min-w-full border">
                  <thead>
                    <tr>
                      <th className="border px-2 py-1">Reviewer</th>
                      <th className="border px-2 py-1">Rating</th>
                      <th className="border px-2 py-1">Comment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listingReviews.map((r,i) => (
                      <tr key={i} className="hover:bg-gray-100">
                        <td className="border px-2 py-1">{r.reviewerName}</td>
                       <td className="border px-2 py-1">{r.rating}</td>
                        <td className="border px-2 py-1">{r.comment}</td>
                      </tr>
                    ))}
                 </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-end mt-4">
              <button onClick={closeListingReviewModal} className="px-3 py-1 bg-gray-300">Close</button>
           </div>
          </>
        )}
      </Modal>

      {/* ───── User Listings Modal ───── */}
      <Modal
        isOpen={!!userListingsModalUser}
        onRequestClose={closeUserListingsModal}
        contentLabel="User Listings"
        ariaHideApp={false}
        className="p-4 bg-white max-w-lg mx-auto mt-20"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
      >
        {userListingsModalUser && (
          <>
            <h2>Listings by {userListingsModalUser.firstname} {userListingsModalUser.lastname}</h2>
            {userListings.length === 0 ? (
              <p>No listings found.</p>
            ) : (
              <div className="overflow-auto max-h-64">
                <table className="min-w-full border">
                  <thead>
                    <tr>
                      <th className="border px-2 py-1">Title</th>
                      <th className="border px-2 py-1">Brand</th>
                      <th className="border px-2 py-1">Price</th>
                      <th className="border px-2 py-1">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userListings.map((l,i) => (
                      <tr key={i} className="hover:bg-gray-100">
                        <td className="border px-2 py-1">{l.title}</td>
                        <td className="border px-2 py-1">{l.brand}</td>
                        <td className="border px-2 py-1">{Number(l.price).toFixed(2)}</td>
                        <td className="border px-2 py-1">{l.stock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-end mt-4">
              <button onClick={closeUserListingsModal} className="px-3 py-1 bg-gray-300">Close</button>
            </div>
          </>
        )}
      </Modal>

    </div>
  );
}
