import * as userModel from '../models/userModel.js';

export const getAllUsers = async () => {
  return await userModel.findAll();
};

export const getUserById = async (id) => {
  return await userModel.findById(id);
};

export const createUser = async (userData) => {
  return await userModel.create(userData);
};

export const updateUser = async (id, userData) => {
  return await userModel.update(id, userData);
};

export const deleteUser = async (id) => {
  return await userModel.remove(id);
};