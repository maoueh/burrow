import * as assert from 'assert';
import { compile } from '../contracts/compile';
import { getAddress } from '../contracts/contract';
import { withoutArrayElements } from '../convert';
import { burrow } from './test';

describe('Multiple return types', function () {
  it('can decode multiple returns', async () => {
    const source = `
      pragma solidity >=0.0.0;
      contract Test {

          function getAddress() public view returns (address) {
            return address(this);
          }

          function getNumber() public pure returns (uint) {
            return 100;
          }

          function getCombination() public view returns (uint _number, address _address, string memory _saying, bytes32 _randomBytes) {
            _number = 100;
            _address = address(this);
            _saying = "hello moto";
            _randomBytes = bytes32(uint256(0xDEADBEEFFEEDFACE));
          }

      }
    `;
    const contract = compile(source, 'Test');
    const instance: any = await contract.deployWith(burrow, {
      handler: function ({ result }) {
        return {
          values: withoutArrayElements(result),
          raw: [...result],
        };
      },
    });
    const expected = {
      values: {
        _number: 100,
        _address: getAddress(instance),
        _saying: 'hello moto',
        _randomBytes: '000000000000000000000000000000000000000000000000DEADBEEFFEEDFACE',
      },
      raw: [
        100,
        getAddress(instance),
        'hello moto',
        '000000000000000000000000000000000000000000000000DEADBEEFFEEDFACE',
      ],
    };
    const result = await instance.getCombination();
    assert.deepStrictEqual(result, expected);
  });
});
