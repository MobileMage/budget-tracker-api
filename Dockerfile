FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS development
RUN npm ci
COPY . .
RUN npx prisma generate
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Build stage: install all deps (including prisma) and generate client
FROM base AS build
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate

FROM base AS production
RUN npm ci --omit=dev
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY . .
EXPOSE 8000
CMD ["node", "src/server.js"]
