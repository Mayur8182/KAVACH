from flask import Flask, request, jsonify
import sqlite3

app = Flask(__name__)

@app.route('/user', methods=['GET'])
def get_user():
    user_id = request.args.get('id')

    query = f"SELECT * FROM users WHERE id = {user_id}"

    cursor = db.execute(query)

    user = cursor.fetchone()
    if user:
        return jsonify(user)
    else:
        return jsonify({'error': 'User not found'}), 404
