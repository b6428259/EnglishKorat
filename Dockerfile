# ใช้ Node.js image ที่เหมาะสม
FROM node:20-alpine

WORKDIR /app

# คัดลอกไฟล์ package.json และ package-lock.json
COPY package*.json ./

# ติดตั้ง dependencies เฉพาะ production
RUN npm install --production

# คัดลอกไฟล์โปรเจกต์ทั้งหมด (ยกเว้นไฟล์ที่อยู่ใน .dockerignore)
COPY . .

EXPOSE 3000

CMD ["npm", "start"]