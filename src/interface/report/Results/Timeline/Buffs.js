import React from 'react';
import PropTypes from 'prop-types';

import { formatDuration } from 'common/format';
import Icon from 'common/Icon';
import SpellLink from 'common/SpellLink';
import BuffsModule from 'parser/core/modules/Buffs';
import Tooltip from 'common/Tooltip';

class Buffs extends React.PureComponent {
  static propTypes = {
    start: PropTypes.number.isRequired,
    secondWidth: PropTypes.number.isRequired,
    parser: PropTypes.shape({
      eventHistory: PropTypes.arrayOf(PropTypes.shape({
        type: PropTypes.string.isRequired,
      })).isRequired,
    }).isRequired,
    buffs: PropTypes.instanceOf(BuffsModule).isRequired,
  };

  constructor() {
    super();
    this.renderEvent = this.renderEvent.bind(this);
  }

  getOffsetLeft(timestamp) {
    return (timestamp - this.props.start) / 1000 * this.props.secondWidth;
  }

  // TODO: Fabricate removebuff events for buffs that expired after the fight

  isApplicableBuffEvent(event) {
    const parser = this.props.parser;

    if (!parser.toPlayer(event)) {
      // Ignore pet/boss buffs
      return false;
    }
    const spellId = event.ability.guid;
    const buff = this.props.buffs.getBuff(spellId);
    // console.log(buff, spellId, event.ability.name, this.props.buffs.activeBuffs)
    if (!buff || !buff.timelineHightlight) {
      return false;
    }

    return true;
  }

  renderEvent(event) {
    switch (event.type) {
      case 'applybuff':
        if (this.isApplicableBuffEvent(event)) {
          return this.renderApplyBuff(event);
        } else {
          return null;
        }
      case 'removebuff':
        if (this.isApplicableBuffEvent(event)) {
          return this.renderRemoveBuff(event);
        } else {
          return null;
        }
      default:
        return null;
    }
  }
  _applied = {};
  _levels = [];
  _getLevel() {
    // Look for the first available level, reusing levels that are no longer used
    let level = 0;
    while (this._levels[level] !== undefined) {
      level += 1;
    }
    return level;
  }
  renderApplyBuff(event) {
    const spellId = event.ability.guid;

    // Avoid overlapping icons
    const level = this._getLevel();
    this._applied[spellId] = event.timestamp;
    this._levels[level] = spellId;

    return this.renderIcon(event, {
      className: 'hoist',
      style: {
        '--level': level,
      },
      children: <div className="time-indicator" />,
    });
  }
  renderRemoveBuff(event) {
    const applied = this._applied[event.ability.guid];
    const left = this.getOffsetLeft(applied);
    const duration = event.timestamp - applied;
    const fightDuration = (applied - this.props.start) / 1000;

    const level = this._levels.indexOf(event.ability.guid);
    this._levels[level] = undefined;

    // TODO: tooltip renders at completely wrong places
    return (
      <Tooltip
        content={`${formatDuration(fightDuration, 3)}: gained ${event.ability.name} for ${(duration / 1000).toFixed(2)}s`}
        key={`buff-${left}-${event.ability.guid}`}
        className="buff hoist"
        wrapperStyles={{
          position: 'absolute',
          left,
          width: (event.timestamp - applied) / 1000 * this.props.secondWidth,
          '--level': level,
        }}
        data-effect="float"
        tagName="div"
      />
    );
  }
  renderIcon(event, { className = '', style = {}, children } = {}) {
    const left = this.getOffsetLeft(event.timestamp);
    return (
      <SpellLink
        key={`cast-${left}-${event.ability.guid}`}
        id={event.ability.guid}
        icon={false}
        className={`cast ${className}`}
        style={{
          left,
          ...style,
        }}
      >
        <Icon
          icon={event.ability.abilityIcon.replace('.jpg', '')}
          alt={event.ability.name}
        />
        {children}
      </SpellLink>
    );
  }
  render() {
    const { parser } = this.props;

    return (
      <div className="buffs">
        {parser.eventHistory.map(this.renderEvent)}
      </div>
    );
  }
}

export default Buffs;
