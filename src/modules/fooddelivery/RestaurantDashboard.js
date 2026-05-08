import React, { useEffect, useMemo, useState } from 'react';
import foodDeliveryService from '../../services/foodDeliveryService';

const STATUS_OPTIONS = [
  'confirmed',
  'preparing',
  'out-for-delivery',
  'delivered',
  'cancelled',
];

const TEAM_ROLE_OPTIONS = [
  { value: 'manager', label: 'Manager' },
  { value: 'dispatcher', label: 'Dispatcher' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'support', label: 'Support' },
  { value: 'analyst', label: 'Analyst' },
];

const DEFAULT_TEAM_DRAFT = {
  memberId: '',
  name: '',
  email: '',
  role: 'support',
  status: 'active',
};

const formatInr = (value) => `INR ${Number(value || 0).toFixed(2)}`;
const formatTimestamp = (value) => {
  if (!value) {
    return 'just now';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'just now' : date.toLocaleString('en-IN');
};

const RestaurantDashboard = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [governance, setGovernance] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const [teamDraft, setTeamDraft] = useState(DEFAULT_TEAM_DRAFT);

  const selectedRestaurant = useMemo(
    () => restaurants.find((restaurant) => restaurant.id === selectedRestaurantId) || null,
    [restaurants, selectedRestaurantId]
  );

  const refreshRestaurantOps = async (restaurantId) => {
    if (!restaurantId) {
      setOrders([]);
      setMenuItems([]);
      setGovernance(null);
      return;
    }

    const [restaurantOrders, restaurantMenu, governanceData] = await Promise.all([
      foodDeliveryService.getRestaurantOrders(restaurantId),
      foodDeliveryService.getMenu(restaurantId),
      foodDeliveryService.getRestaurantGovernance(restaurantId),
    ]);

    setOrders(restaurantOrders);
    setMenuItems(restaurantMenu);
    setGovernance(governanceData);
  };

  useEffect(() => {
    foodDeliveryService
      .getManagedRestaurants()
      .then((restaurantList) => {
        setRestaurants(restaurantList);
        if (restaurantList[0]?.id) {
          setSelectedRestaurantId(restaurantList[0].id);
          setIsOpen(Boolean(restaurantList[0].open));
          setPrepTime(restaurantList[0].avgPreparationTime || restaurantList[0].deliveryTime || '');
        }
      })
      .catch((error) => {
        console.error('Failed to load managed restaurants for dashboard:', error);
        setStatusMessage(error.response?.data?.message || 'Unable to load your managed restaurants.');
      });
  }, []);

  useEffect(() => {
    if (!selectedRestaurant) {
      return;
    }

    setIsOpen(Boolean(selectedRestaurant.open));
    setPrepTime(selectedRestaurant.avgPreparationTime || selectedRestaurant.deliveryTime || '');

    refreshRestaurantOps(selectedRestaurant.id).catch((error) => {
      console.error('Failed to load restaurant operations:', error);
      setStatusMessage(error.response?.data?.message || 'Unable to load restaurant operations right now.');
    });
  }, [selectedRestaurant]);

  const handleStatusChange = async (orderId, status) => {
    if (!selectedRestaurantId) {
      return;
    }

    try {
      const updatedOrder = await foodDeliveryService.updateRestaurantOrderStatus(
        selectedRestaurantId,
        orderId,
        status
      );

      setOrders((currentOrders) =>
        currentOrders.map((order) => (order.id === orderId ? updatedOrder : order))
      );
      setStatusMessage(`Order ${orderId} moved to ${status}.`);
    } catch (error) {
      setStatusMessage(error.response?.data?.message || 'Unable to update order status.');
    }
  };

  const handleAutoAssignRider = async (orderId) => {
    if (!selectedRestaurantId) {
      return;
    }

    try {
      const updatedOrder = await foodDeliveryService.assignRider(selectedRestaurantId, orderId);
      setOrders((currentOrders) =>
        currentOrders.map((order) => (order.id === orderId ? updatedOrder : order))
      );
      setStatusMessage(`Rider assigned to order ${orderId}.`);
    } catch (error) {
      setStatusMessage(error.response?.data?.message || 'Unable to assign rider.');
    }
  };

  const handleSaveAvailability = async () => {
    if (!selectedRestaurantId) {
      return;
    }

    try {
      const updatedRestaurant = await foodDeliveryService.updateRestaurantAvailability(selectedRestaurantId, {
        open: isOpen,
        avgPreparationTime: prepTime,
      });

      setRestaurants((currentRestaurants) =>
        currentRestaurants.map((restaurant) =>
          restaurant.id === updatedRestaurant.id ? updatedRestaurant : restaurant
        )
      );
      setGovernance((currentGovernance) =>
        currentGovernance
          ? {
              ...currentGovernance,
              restaurant: {
                ...currentGovernance.restaurant,
                ...updatedRestaurant,
              },
            }
          : currentGovernance
      );
      setStatusMessage(`Restaurant is now ${updatedRestaurant.open ? 'open' : 'closed'}.`);
    } catch (error) {
      setStatusMessage(error.response?.data?.message || 'Unable to update restaurant availability.');
    }
  };

  const handleToggleMenuAvailability = async (item) => {
    if (!selectedRestaurantId) {
      return;
    }

    try {
      const updatedItem = await foodDeliveryService.updateMenuAvailability(selectedRestaurantId, item.id, {
        available: !item.available,
        prepTime: item.prepTime,
      });

      setMenuItems((currentItems) =>
        currentItems.map((menuItem) => (menuItem.id === updatedItem.id ? updatedItem : menuItem))
      );
      setStatusMessage(`${updatedItem.name} is now ${updatedItem.available ? 'available' : 'unavailable'}.`);
    } catch (error) {
      setStatusMessage(error.response?.data?.message || 'Unable to update menu availability.');
    }
  };

  const handleSaveTeamMember = async () => {
    if (!selectedRestaurantId) {
      return;
    }

    if (!teamDraft.email.trim()) {
      setStatusMessage('A staff email is required to save restaurant access.');
      return;
    }

    try {
      const governanceData = await foodDeliveryService.saveRestaurantTeamMember(selectedRestaurantId, {
        memberId: teamDraft.memberId || undefined,
        name: teamDraft.name,
        email: teamDraft.email,
        role: teamDraft.role,
        status: teamDraft.status,
      });

      setGovernance(governanceData);
      setRestaurants((currentRestaurants) =>
        currentRestaurants.map((restaurant) =>
          restaurant.id === selectedRestaurantId ? governanceData.restaurant || restaurant : restaurant
        )
      );
      setTeamDraft(DEFAULT_TEAM_DRAFT);
      setStatusMessage(
        `${teamDraft.memberId ? 'Updated' : 'Added'} ${teamDraft.email} as ${teamDraft.role}.`
      );
    } catch (error) {
      setStatusMessage(error.response?.data?.message || 'Unable to save restaurant team member.');
    }
  };

  const handleEditMember = (member) => {
    setTeamDraft({
      memberId: member.id,
      name: member.name || '',
      email: member.email || '',
      role: member.role || 'support',
      status: member.status || 'active',
    });
  };

  const handleToggleMemberStatus = async (member) => {
    if (!selectedRestaurantId) {
      return;
    }

    try {
      const governanceData = await foodDeliveryService.saveRestaurantTeamMember(selectedRestaurantId, {
        memberId: member.id,
        name: member.name,
        email: member.email,
        role: member.role,
        status: member.status === 'active' ? 'inactive' : 'active',
      });

      setGovernance(governanceData);
      setStatusMessage(
        `${member.email} is now ${member.status === 'active' ? 'inactive' : 'active'}.`
      );
    } catch (error) {
      setStatusMessage(error.response?.data?.message || 'Unable to update team member status.');
    }
  };

  if (restaurants.length === 0 && statusMessage) {
    return (
      <div className="restaurant-dashboard">
        <h2>Restaurant Operations</h2>
        <p>{statusMessage}</p>
      </div>
    );
  }

  return (
    <div className="restaurant-dashboard">
      <h2>Restaurant Operations</h2>

      <div className="fd-controls">
        <select
          value={selectedRestaurantId}
          onChange={(event) => setSelectedRestaurantId(event.target.value)}
        >
          {restaurants.map((restaurant) => (
            <option key={restaurant.id} value={restaurant.id}>
              {restaurant.name}
            </option>
          ))}
        </select>

        <label>
          <input
            type="checkbox"
            checked={isOpen}
            onChange={(event) => setIsOpen(event.target.checked)}
          />
          Accepting orders
        </label>

        <input
          placeholder="Avg prep time"
          value={prepTime}
          onChange={(event) => setPrepTime(event.target.value)}
        />

        <button onClick={handleSaveAvailability}>Save Availability</button>
      </div>

      {statusMessage && <p>{statusMessage}</p>}

      <div className="orders-list">
        <h3>Incoming Orders</h3>
        {orders.length === 0 && <p>No restaurant orders yet.</p>}
        {orders.map((order) => (
          <div key={order.id} className="order-item">
            <span>Order {order.id}</span>
            <span>Total: {formatInr(order.total)}</span>
            <span>Status: {order.status}</span>
            <span>Rider: {order.driverProfile?.name || 'Unassigned'}</span>
            <select
              onChange={(event) => handleStatusChange(order.id, event.target.value)}
              value={order.status}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <button onClick={() => handleAutoAssignRider(order.id)}>Assign Rider</button>
          </div>
        ))}
      </div>

      <div className="orders-list">
        <h3>Inventory Control</h3>
        {menuItems.length === 0 && <p>No menu items found for this restaurant.</p>}
        {menuItems.map((item) => (
          <div key={item.id} className="order-item">
            <span>{item.name}</span>
            <span>{formatInr(item.price)}</span>
            <span>{item.available ? 'Available' : 'Paused'}</span>
            <button onClick={() => handleToggleMenuAvailability(item)}>
              {item.available ? 'Pause Item' : 'Enable Item'}
            </button>
          </div>
        ))}
      </div>

      <div className="orders-list">
        <h3>Restaurant Governance</h3>
        {governance ? (
          <>
            <div className="order-item">
              <span>Owner: {governance.restaurant?.ownerId || 'Unclaimed / bootstrap access'}</span>
              <span>Active team: {governance.activeTeamMemberCount}</span>
              <span>
                Your permissions:
                {' '}
                {governance.currentUserPermissions?.length
                  ? governance.currentUserPermissions.join(', ')
                  : 'bootstrap-owner'}
              </span>
            </div>

            <div className="fd-controls">
              <input
                placeholder="Staff name"
                value={teamDraft.name}
                onChange={(event) =>
                  setTeamDraft((currentDraft) => ({
                    ...currentDraft,
                    name: event.target.value,
                  }))
                }
              />
              <input
                placeholder="Staff email"
                value={teamDraft.email}
                onChange={(event) =>
                  setTeamDraft((currentDraft) => ({
                    ...currentDraft,
                    email: event.target.value,
                  }))
                }
              />
              <select
                value={teamDraft.role}
                onChange={(event) =>
                  setTeamDraft((currentDraft) => ({
                    ...currentDraft,
                    role: event.target.value,
                  }))
                }
              >
                {TEAM_ROLE_OPTIONS.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              <select
                value={teamDraft.status}
                onChange={(event) =>
                  setTeamDraft((currentDraft) => ({
                    ...currentDraft,
                    status: event.target.value,
                  }))
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <button onClick={handleSaveTeamMember}>
                {teamDraft.memberId ? 'Update Staff Access' : 'Add Staff Member'}
              </button>
            </div>

            <h4>Team Access</h4>
            {governance.teamMembers.length === 0 && <p>No staff access has been configured yet.</p>}
            {governance.teamMembers.map((member) => (
              <div key={member.id} className="order-item">
                <span>{member.name || member.email}</span>
                <span>{member.role}</span>
                <span>{member.status}</span>
                <span>{member.permissions.join(', ')}</span>
                <button onClick={() => handleEditMember(member)}>Edit</button>
                <button onClick={() => handleToggleMemberStatus(member)}>
                  {member.status === 'active' ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            ))}

            <h4>Recent Audit Activity</h4>
            {governance.recentAuditLog.length === 0 && <p>No governance events logged yet.</p>}
            {governance.recentAuditLog.slice(0, 6).map((entry) => (
              <div key={entry.id} className="order-item">
                <span>{entry.summary}</span>
                <span>{entry.performedByName || entry.performedByRole || 'system'}</span>
                <span>{formatTimestamp(entry.timestamp)}</span>
              </div>
            ))}
          </>
        ) : (
          <p>Loading governance details...</p>
        )}
      </div>
    </div>
  );
};

export default RestaurantDashboard;
