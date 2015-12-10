module.exports = {
    //Simple Operational Transform
    transformOperation: function(opr1, opr2, flag) {
        var transformed1 = JSON.parse(JSON.stringify(opr2));

        if (opr1.type == 'ERASE' && opr2.type == 'ERASE') {
            if (flag) {
                if (opr1.position < opr2.position) {
                    transformed1.position = opr2.position - 1;
                }
            } else {
                if (opr1.position <= opr2.position) {
                    transformed1.position = opr2.position - 1;
                }
            }
        } else if (opr1.type == 'INSERT' && opr2.type == 'INSERT') {
            if (flag) {
                if (opr1.position < opr2.position) {
                    transformed1.position = opr2.position + 1;
                }
            } else {
                if (opr1.position <= opr2.position) {
                    transformed1.position = opr2.position + 1;
                }
            }
        } else if (opr1.type == 'INSERT' && opr2.type == 'ERASE') {
            if (flag) {
                if (opr1.position < opr2.position) {
                    transformed1.position = opr2.position + 1;
                }
            } else {
                if (opr1.position <= opr2.position) {
                    transformed1.position = opr2.position + 1;
                }
            }
        } else if (opr1.type == 'ERASE' && opr2.type == 'INSERT') {
            if (flag) {
                if (opr1.position < opr2.position) {
                    transformed1.position = opr2.position - 1;
                }
            } else {
                if (opr1.position <= opr2.position) {
                    transformed1.position = opr2.position - 1;
                }
            }
        } else if (opr1.type == 'ERASE' && opr2.type == 'REPOSITION') {
            if (flag) {
                if (opr1.position < opr2.position) {
                    transformed1.position = opr2.position - 1;
                }
            } else {
                if (opr1.position <= opr2.position) {
                    transformed1.position = opr2.position - 1;
                }
            }
        } else if (opr1.type == 'INSERT' && opr2.type == 'REPOSITION') {
            if (flag) {
                if (opr1.position < opr2.position) {
                    transformed1.position = opr2.position + 1;
                }
            } else {
                if (opr1.position <= opr2.position) {
                    transformed1.position = opr2.position + 1;
                }
            }
        }

        return transformed1;
    }
    ,

    //Compound Operational Transform
    transform: function(operation, Buffer) {
        for (var i = operation.lastSyncStamp; i < Buffer.length; i++) {
            var op = Buffer[i];
            if (op.userId != operation.userId) {
                var transformed1 = exports.transformOperation(op, operation, true);
                var transformed2 = exports.transformOperation(operation, op, false);
                operation = transformed1;
                Buffer[i] = transformed2;
            }
        }
        return operation;
    }
}