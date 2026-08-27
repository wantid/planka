#!/usr/bin/env python3
"""Diagnose board load for a given board ID."""

import json
import sys
import urllib.error
import urllib.request

BASE = 'http://localhost:1337/api'
BOARD_ID = sys.argv[1] if len(sys.argv) > 1 else '1850947149257245701'


def request(method, path, data=None, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    body = None if data is None else json.dumps(data).encode()
    req = urllib.request.Request(f'{BASE}{path}', data=body, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)


def main():
    auth = request('POST', '/access-tokens', {'emailOrUsername': 'demo@demo.demo', 'password': 'demo'})
    token = auth['item']['accessToken'] if isinstance(auth['item'], dict) else auth['item']

    print('=== Projects ===')
    projects = request('GET', '/projects', token=token)
    boards = projects.get('included', {}).get('boards', [])
    board_ids = [b['id'] for b in boards]
    print(f'  projects: {len(projects.get("items", []))}')
    print(f'  boards in projects: {len(boards)}')
    print(f'  target board in projects: {BOARD_ID in board_ids}')

    print('\n=== GET board ===')
    try:
        board = request('GET', f'/boards/{BOARD_ID}', token=token)
        item = board.get('item', {})
        included = board.get('included', {})
        print(f'  board id: {item.get("id")}')
        print(f'  board name: {item.get("name")}')
        print(f'  projectId: {item.get("projectId")}')
        print(f'  lists: {len(included.get("lists", []))}')
        print(f'  cards: {len(included.get("cards", []))}')
    except urllib.error.HTTPError as exc:
        body = exc.read().decode()
        print(f'  HTTP {exc.code}: {body}')

    print('\n=== My cards boards ===')
    my = request('GET', '/users/me/cards', token=token)
    my_boards = my.get('included', {}).get('boards', [])
    my_board_ids = [b['id'] for b in my_boards]
    print(f'  cards: {len(my.get("items", []))}')
    print(f'  boards in my-cards: {len(my_boards)}')
    print(f'  target board in my-cards: {BOARD_ID in my_board_ids}')

    print('\n=== Board memberships for target board ===')
    memberships = projects.get('included', {}).get('boardMemberships', [])
    board_memberships = [m for m in memberships if m.get('boardId') == BOARD_ID]
    print(f'  memberships on board: {len(board_memberships)}')
    for m in board_memberships:
        print(f'    userId: {m.get("userId")}')

    user = request('GET', '/users/me', token=token)
    user_id = user['item']['id']
    print(f'  current user id: {user_id}')
    print(f'  user is member: {any(m.get("userId") == user_id for m in board_memberships)}')

    project_id = next(b['projectId'] for b in boards if b['id'] == BOARD_ID)
    project = next(p for p in projects['items'] if p['id'] == project_id)
    print(f'\n=== Project access ===')
    print(f'  project: {project.get("name")}')
    print(f'  ownerProjectManagerId: {project.get("ownerProjectManagerId")}')
    print(f'  user role: {user["item"].get("role")}')

if __name__ == '__main__':
    main()
