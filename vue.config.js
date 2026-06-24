const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  publicPath: process.env.NODE_ENV === "production" ? "/osi/" : "/",  // МОЕ, ЧИСТОЕ OSI GITHUB WEB PAGES
  outputDir: "docs",  // МОЕ, ЧИСТОЕ OSI GITHUB WEB PAGES
  // publicPath: process.env.NODE_ENV === "production" ? "/osi/docs" : "/",  // Эксперименты с Битрикс
  // outputDir: "bx_docs",  // Эксперименты с Битрикс
})
