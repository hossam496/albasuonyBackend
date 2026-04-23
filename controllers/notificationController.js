const Notification = require('../models/Notification');

// @GET /api/notifications
exports.getMyNotifications = async (req, res, next) => {
    try {
        const notifications = await Notification.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .limit(50);
        res.status(200).json({ success: true, notifications });
    } catch (error) {
        next(error);
    }
};

// @PATCH /api/notifications/:id/read
exports.markAsRead = async (req, res, next) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, user: req.user.id },
            { isRead: true },
            { new: true }
        );
        res.status(200).json({ success: true, notification });
    } catch (error) {
        next(error);
    }
};

// @PATCH /api/notifications/read-all
exports.markAllAsRead = async (req, res, next) => {
    try {
        await Notification.updateMany(
            { user: req.user.id, isRead: false },
            { isRead: true }
        );
        res.status(200).json({ success: true, message: 'All notifications marked as read.' });
    } catch (error) {
        next(error);
    }
};
