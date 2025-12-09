import { PrismaClient } from "@prisma/client";

export const db = new PrismaClient();

export const dbHelpers = {
  async findById(model: any, id: string) {
    return model.findUnique({ where: { id } });
  },

  async create(model: any, data: any) {
    return model.create({ data });
  },

  async update(model: any, id: string, data: any) {
    return model.update({ where: { id }, data });
  },

  async remove(model: any, id: string) {
    return model.delete({ where: { id } });
  },
};
