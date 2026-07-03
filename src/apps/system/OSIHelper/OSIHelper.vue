<template src="./template.html"></template>
<style src="./style.css"></style>
<script>
    export default {
        name: "OSIHelper",

        props: {
            windowId: {type: String, required: true},
            USERID: {type: Number, default: 0},
            fileData: { type: Object, default: null },
            fileId: { type: [String, Number], default: null },
            fileName: { type: String, default: '' },
            fileType: { type: String, default: '' },
        },
    }
</script>