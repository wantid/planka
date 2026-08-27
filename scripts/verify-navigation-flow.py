#!/usr/bin/env python3
"""Verify card -> board navigation API flow (simulates router loadBoard)."""

import json
import sys
import urllib.error
import urllib.request

BASE = 'http://localhost:1337/api'


def request(method, path, data=None, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    body = None if data is None else json.dumps(data).encode()
    req = urllib.request.Request(f'{BASE}{path}', data=body, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)


def main():
    errors = []

    try:
        auth = request('POST', '/access-tokens', {'emailOrUsername': 'demo@demo.demo', 'password': 'demo'})
        token = auth['item']['accessToken'] if isinstance(auth['item'], dict) else auth['item']

        my = request('GET', '/users/me/cards', token=token)
        if not my.get('items'):
            print('SKIP: no my-cards to test')
            return 0

        card_id = my['items'][0]['id']
        board_id = my['items'][0]['boardId']

        # Simulate opening card (card already in ORM -> loadBoard without markAsFetching)
        card = request('GET', f'/cards/{card_id}', token=token)
        if 'item' not in card:
            errors.append('GET card failed')

        # Simulate closing card -> board (markAsFetching path)
        board = request('GET', f'/boards/{board_id}', token=token)
        if 'item' not in board:
            errors.append('GET board failed')
        elif not board['included'].get('lists'):
            errors.append('GET board returned no lists')

        # Simulate stuck isFetching retry (second board fetch)
        board2 = request('GET', f'/boards/{board_id}', token=token)
        if 'item' not in board2:
            errors.append('GET board retry failed')

        print('OK: card->board API flow')
        print('  cards:', len(my['items']))
        print('  lists:', len(board['included'].get('lists', [])))
        print('  retry:', board2['item']['id'] == board_id)

    except urllib.error.URLError as exc:
        errors.append(f'connection: {exc}')
    except Exception as exc:  # noqa: BLE001
        errors.append(str(exc))

    if errors:
        print('FAIL:', '; '.join(errors), file=sys.stderr)
        return 1

    return 0


if __name__ == '__main__':
    sys.exit(main())
