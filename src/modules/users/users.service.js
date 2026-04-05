const prisma = require('../../config/prisma');

const safeSelect = {
  id: true, name: true, email: true, role: true, isActive: true, createdAt: true,
};

const listUsers  = () =>
  prisma.user.findMany({ select: safeSelect, orderBy: { createdAt: 'desc' } });

const getUser    = (id) =>
  prisma.user.findUniqueOrThrow({ where: { id }, select: safeSelect });

const updateUser = (id, data) => {
  const allowed = {};
  if (data.name     !== undefined) allowed.name     = data.name;
  if (data.role     !== undefined) allowed.role     = data.role;
  if (data.isActive !== undefined) allowed.isActive = data.isActive;
  return prisma.user.update({ where: { id }, data: allowed, select: safeSelect });
};

// Soft delete — deactivate instead of hard remove
const deleteUser = (id) =>
  prisma.user.update({ where: { id }, data: { isActive: false }, select: safeSelect });

module.exports = { listUsers, getUser, updateUser, deleteUser };
